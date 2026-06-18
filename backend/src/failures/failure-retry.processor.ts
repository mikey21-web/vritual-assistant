import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

@Processor('failure-retry')
export class FailureRetryProcessor extends WorkerHost {
  constructor(private prisma: PrismaService, private config: ConfigService) { super(); }

  async process(job: Job<{ failureId: string }, any, string>) {
    const { failureId } = job.data;
    const failure = await this.prisma.failureRecord.findUnique({ where: { id: failureId } });
    if (!failure) return { processed: false, reason: 'not_found' };

    try {
      if (failure.operation === 'push_to_crm') {
        const resp = await fetch(`${this.config.get<string>('BACKEND_URL', 'http://localhost:3001')}/leads/${failure.leadId}/conversions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-service-key': this.config.get<string>('AGENT_SERVICE_JWT', '') },
          body: JSON.stringify({ destination: 'CRM_QUALIFIED_PUSH' }),
        });
        const ok = resp.ok || resp.status === 202;
        await this.prisma.failureRecord.update({
          where: { id: failureId },
          data: { status: ok ? 'resolved' : 'open', attempts: failure.attempts + 1 },
        });
        return { processed: true, failureId, resolved: ok };
      }

      await this.prisma.failureRecord.update({
        where: { id: failureId },
        data: { status: 'resolved', attempts: failure.attempts + 1 },
      });
      return { processed: true, failureId, resolved: true };
    } catch (e: any) {
      const exceeded = failure.attempts + 1 >= failure.maxAttempts;
      await this.prisma.failureRecord.update({
        where: { id: failureId },
        data: { status: exceeded ? 'open' : 'retrying', attempts: failure.attempts + 1 },
      });
      return { processed: false, failureId, error: e.message };
    }
  }
}
