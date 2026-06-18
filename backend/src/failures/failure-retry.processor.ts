import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';

@Processor('failure-retry')
export class FailureRetryProcessor extends WorkerHost {
  constructor(private prisma: PrismaService) { super(); }

  async process(job: Job<{ failureId: string }, any, string>) {
    const { failureId } = job.data;
    const failure = await this.prisma.failureRecord.findUnique({ where: { id: failureId } });
    if (!failure) return { processed: false, reason: 'not_found' };

    // The actual retry dispatch happens via the AutomationRetryProcessor
    // This processor confirms the failure was picked up and queues it for retry
    return { processed: true, failureId, type: failure.type };
  }
}
