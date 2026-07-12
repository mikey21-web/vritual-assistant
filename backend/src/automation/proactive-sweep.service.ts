import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

const SWEEP_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

@Injectable()
export class ProactiveSweepService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ProactiveSweepService.name);

  constructor(@InjectQueue('proactive-sweep') private queue: Queue) {}

  async onApplicationBootstrap() {
    await this.queue.add(
      'sweep',
      {},
      {
        jobId: 'proactive-sweep-recurring',
        repeat: { every: SWEEP_INTERVAL_MS },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );
    this.logger.log(`Proactive sweep scheduled every ${SWEEP_INTERVAL_MS / 60000} minutes`);
  }
}
