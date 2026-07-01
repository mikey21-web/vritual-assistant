import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { DataPruningService } from './data-pruning.service';

@Processor('data-pruning')
export class DataPruningProcessor extends WorkerHost {
  private readonly logger = new Logger(DataPruningProcessor.name);

  constructor(private pruning: DataPruningService) {
    super();
  }

  async process(job: Job): Promise<any> {
    this.logger.log(`Data pruning job started (${job.id})`);
    const results = await this.pruning.pruneAll();
    this.logger.log(`Data pruning completed: ${JSON.stringify(results)}`);
    return results;
  }
}
