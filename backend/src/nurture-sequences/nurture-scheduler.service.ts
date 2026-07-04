import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { NurtureProcessorService } from './nurture-processor.service';

/**
 * BullMQ worker for the 'nurture' queue.
 *
 * A repeatable 'nurture-poll' job is registered on application bootstrap.
 * Each poll cycle finds NurtureProgress records whose dueAt has elapsed,
 * claims them atomically, and delegates processing to NurtureProcessorService.
 */
@Injectable()
@Processor('nurture')
export class NurtureSchedulerService extends WorkerHost implements OnApplicationBootstrap {
  private readonly logger = new Logger(NurtureSchedulerService.name);

  constructor(
    private prisma: PrismaService,
    private processor: NurtureProcessorService,
    @InjectQueue('nurture') private queue: Queue,
  ) {
    super();
  }

  async onApplicationBootstrap() {
    // Register a recurring poll job every 30 seconds
    const jobId = 'nurture-poll';
    const exists = await this.queue.getJob(jobId).catch(() => null);
    if (!exists) {
      await this.queue.add(
        'nurture-poll',
        { type: 'poll' },
        {
          jobId,
          repeat: { every: 30_000 },
          removeOnComplete: true,
          removeOnFail: false,
          attempts: 1,
        },
      );
      this.logger.log('Nurture poll job registered (every 30s)');
    }
  }

  async process(job: Job<{ type: string }>): Promise<any> {
    if (job.data.type === 'poll') {
      return this.pollAndProcess();
    }
    return { processed: false, reason: 'unknown_job_type' };
  }

  private async pollAndProcess(): Promise<{ processed: number }> {
    const records = await this.prisma.nurtureProgress.findMany({
      where: {
        status: 'pending',
        dueAt: { lte: new Date() },
      },
      take: 10,
      orderBy: { dueAt: 'asc' },
    });

    if (records.length === 0) return { processed: 0 };

    let processedCount = 0;

    for (const record of records) {
      // Atomic claim — only process if still pending
      const claim = await this.prisma.nurtureProgress.updateMany({
        where: { id: record.id, status: 'pending' },
        data: { status: 'processing' },
      });

      if (claim.count === 0) {
        this.logger.debug(`Nurture progress ${record.id} already claimed — skipping`);
        continue;
      }

      try {
        const result = await this.processor.process(record.leadId, record.sequenceId);
        if (result.processed) {
          processedCount++;
          this.logger.debug(
            `Nurture progress ${record.id} processed (lead=${record.leadId}, sequence=${record.sequenceId})`,
          );
        } else {
          this.logger.warn(
            `Nurture progress ${record.id} processed but returned error: ${result.error}`,
          );
          // Mark as failed so it doesn't get picked up again
          await this.prisma.nurtureProgress.update({
            where: { id: record.id },
            data: { status: 'failed', error: result.error || 'Processing returned error' },
          });
        }
      } catch (e: any) {
        this.logger.error(
          `Nurture progress ${record.id} failed: ${e.message}`,
          e.stack,
        );
        await this.prisma.nurtureProgress.update({
          where: { id: record.id },
          data: { status: 'failed', error: e.message },
        });
      }
    }

    this.logger.debug(`Nurture poll: processed ${processedCount}/${records.length} records`);
    return { processed: processedCount };
  }
}
