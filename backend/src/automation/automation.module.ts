import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AutomationSchedulerService } from './automation-scheduler.service';
import { AutomationScheduleProcessor } from './automation-schedule.processor';
import { DataPruningService } from './data-pruning.service';
import { DataPruningProcessor } from './data-pruning.processor';
import { FollowupProcessorService } from './followup-processor.service';
import { ConversationsModule } from '../conversations/conversations.module';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: 'automation-schedule' },
      { name: 'data-pruning' },
      { name: 'followup' },
    ),
    ConversationsModule,
  ],
  providers: [
    AutomationSchedulerService,
    AutomationScheduleProcessor,
    DataPruningService,
    DataPruningProcessor,
    FollowupProcessorService,
  ],
  exports: [
    AutomationSchedulerService,
    DataPruningService,
  ],
})
export class AutomationModule {}
