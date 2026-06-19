import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { ConfigService } from '@nestjs/config';

const EVENT_WEBHOOK_MAP: Record<string, string> = {
  LEAD_CREATED: 'lead-intake',
  LEAD_HOT: 'hot-lead',
  LEAD_QUALIFIED: 'lead-intake',
  CRM_PUSH_REQUESTED: 'crm-push',
  APPOINTMENT_REQUESTED: 'appointment-request',
  QUOTE_REQUESTED: 'quote-request',
  DIGITAL_DOWNLOAD_REQUESTED: 'digital-download',
  DIGITAL_DOWNLOAD_DELIVERED: 'digital-download',
  PAYMENT_SUCCESS: 'payment-success',
};

@Processor('automation-retry')
export class AutomationRetryProcessor extends WorkerHost {
  constructor(
    private prisma: PrismaService,
    private auditLogs: AuditLogsService,
    private config: ConfigService,
  ) {
    super();
  }

  async process(job: Job<{ eventId: string }, any, string>): Promise<any> {
    const { eventId } = job.data;

    const event = await this.prisma.automationEvent.findUnique({ where: { id: eventId } });
    if (!event) {
      await this.auditLogs.log('automation_retry_failed', 'AutomationEvent', eventId, undefined, { error: 'Event not found' });
      return { processed: false, eventId, error: 'Event not found' };
    }

    try {
      const n8nUrl = this.config.get<string>('N8N_WEBHOOK_URL', 'http://localhost:5678');
      const jwt = this.config.get<string>('N8N_BACKEND_JWT', '');
      const backendUrl = this.config.get<string>('NEXT_PUBLIC_API_URL') || this.config.get<string>('BACKEND_URL') || 'http://localhost:3001';

      const webhookPath = EVENT_WEBHOOK_MAP[event.type];

      let res: globalThis.Response;

      if (webhookPath) {
        res = await fetch(`${n8nUrl}/webhook/${webhookPath}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.config.get<string>('N8N_WEBHOOK_API_KEY', ''),
          },
          body: JSON.stringify(
            typeof event.payload === 'object' ? event.payload : { eventId: event.id, type: event.type },
          ),
        });
      } else {
        res = await fetch(`${backendUrl}/webhooks/n8n-fallback`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${jwt}`,
          },
          body: JSON.stringify({
            eventId: event.id,
            type: event.type,
            payload: event.payload,
            isRetry: true,
            attempt: event.attempts + 1,
          }),
        });
      }

      const isPermFailure = webhookPath
        ? !res.ok && res.status >= 400 && res.status < 500
        : !res.ok && res.status >= 400 && res.status < 500;

      if (res.ok || res.status === 202 || res.status === 204) {
        await this.prisma.automationEvent.update({
          where: { id: eventId },
          data: { status: 'completed', nextRetryAt: null },
        });
        await this.auditLogs.log('automation_retry_success', 'AutomationEvent', eventId, undefined, {
          type: event.type, attempt: event.attempts + 1, target: webhookPath || 'backend-fallback',
        });
        return { processed: true, eventId, dispatched: true };
      }

      const errorText = await res.text().catch(() => 'Unknown error');

      if (isPermFailure) {
        await this.prisma.automationEvent.update({
          where: { id: eventId },
          data: { status: 'failed', lastError: `Permanent failure (${res.status}): ${errorText}`, nextRetryAt: null },
        });
        await this.auditLogs.log('automation_retry_permanent_fail', 'AutomationEvent', eventId, undefined, {
          status: res.status, error: errorText, type: event.type,
        });
        return { processed: false, eventId, error: errorText, permanent: true };
      }

      const exceeded = event.attempts + 1 >= event.maxAttempts;
      await this.prisma.automationEvent.update({
        where: { id: eventId },
        data: {
          status: exceeded ? 'failed' : 'retrying',
          attempts: event.attempts + 1,
          lastError: `Dispatch failed (${res.status}): ${errorText}`,
          nextRetryAt: exceeded ? null : new Date(Date.now() + Math.pow(2, event.attempts + 1) * 10000),
        },
      });
      await this.auditLogs.log(exceeded ? 'automation_retry_exhausted' : 'automation_retry_failed', 'AutomationEvent', eventId, undefined, {
        status: res.status, error: errorText, attempt: event.attempts + 1, maxAttempts: event.maxAttempts,
      });
      return { processed: false, eventId, error: errorText, exceeded };
    } catch (e: any) {
      const exceeded = event.attempts + 1 >= event.maxAttempts;
      await this.prisma.automationEvent.update({
        where: { id: eventId },
        data: {
          status: exceeded ? 'failed' : 'retrying',
          attempts: event.attempts + 1,
          lastError: e.message,
          nextRetryAt: exceeded ? null : new Date(Date.now() + Math.pow(2, event.attempts + 1) * 10000),
        },
      });
      await this.auditLogs.log(exceeded ? 'automation_retry_exhausted' : 'automation_retry_failed', 'AutomationEvent', eventId, undefined, {
        error: e.message, attempt: event.attempts + 1, maxAttempts: event.maxAttempts,
      });
      return { processed: false, eventId, error: e.message, exceeded };
    }
  }
}
