import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

@Processor('automation-schedule')
export class AutomationScheduleProcessor extends WorkerHost {
  private readonly logger = new Logger(AutomationScheduleProcessor.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    super();
  }

  async process(job: Job<{ leadId: string; kind: string; dedupeKey: string }, any, string>): Promise<any> {
    const { leadId, kind, dedupeKey } = job.data;

    // Atomic claim: only process if still pending
    const result = await this.prisma.scheduledAction.updateMany({
      where: { dedupeKey, status: 'pending' },
      data: { status: 'claimed', attempts: { increment: 1 } },
    });

    if (result.count === 0) {
      this.logger.debug(`Skipping ${dedupeKey} — already claimed/cancelled`);
      return { processed: false, reason: 'not_pending' };
    }

    try {
      // Call the agent service to handle this scheduled action
      const agentUrl = this.config.get<string>('AGENT_SERVICE_URL', 'http://agent-service:8000');
      const agentKey = this.config.get<string>('AGENT_INBOUND_KEY', '');

      const lead = await this.prisma.lead.findUnique({
        where: { id: leadId },
        select: { id: true, contactId: true },
      });
      if (!lead) {
        await this.prisma.scheduledAction.updateMany({
          where: { dedupeKey },
          data: { status: 'failed' },
        });
        return { processed: false, reason: 'lead_not_found' };
      }

      const resp = await fetch(`${agentUrl}/agent/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Agent-Key': agentKey,
        },
        body: JSON.stringify({
          leadId,
          triggerId: dedupeKey,
          channel: 'WHATSAPP',
          trigger: kind,
          messageText: null,
        }),
      });

      if (resp.ok || resp.status === 202) {
        await this.prisma.scheduledAction.updateMany({
          where: { dedupeKey },
          data: { status: 'done' },
        });
        this.logger.log(`Scheduled action completed: ${dedupeKey}`);
        return { processed: true, dedupeKey };
      } else {
        const errText = await resp.text().catch(() => 'unknown');
        await this.prisma.scheduledAction.updateMany({
          where: { dedupeKey },
          data: { status: 'failed' },
        });
        this.logger.warn(`Agent returned ${resp.status} for ${dedupeKey}: ${errText}`);
        return { processed: false, reason: `agent_error: ${resp.status}` };
      }
    } catch (e: any) {
      this.logger.error(`Failed to process ${dedupeKey}: ${e.message}`);
      await this.prisma.scheduledAction.updateMany({
        where: { dedupeKey },
        data: { status: 'failed' },
      });
      return { processed: false, reason: e.message };
    }
  }
}
