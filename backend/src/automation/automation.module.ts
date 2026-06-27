import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AutomationSchedulerService } from './automation-scheduler.service';
import { AutomationScheduleProcessor } from './automation-schedule.processor';
import { DataPruningService } from './data-pruning.service';
import { DataPruningProcessor } from './data-pruning.processor';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: 'automation-schedule' },
      { name: 'data-pruning' },
    ),
  ],
  providers: [AutomationSchedulerService, AutomationScheduleProcessor, DataPruningService, DataPruningProcessor],
  exports: [AutomationSchedulerService, DataPruningService],
})
export class AutomationModule {}
