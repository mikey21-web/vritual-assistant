import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AutomationSchedulerService } from './automation-scheduler.service';
import { AutomationScheduleProcessor } from './automation-schedule.processor';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'automation-schedule' }),
  ],
  providers: [AutomationSchedulerService, AutomationScheduleProcessor],
  exports: [AutomationSchedulerService],
})
export class AutomationModule {}
