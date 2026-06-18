import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AutomationEventsService } from './automation-events.service';
import { AutomationEventsController } from './automation-events.controller';
import { AutomationRetryProcessor } from './automation-events.processor';

@Module({
  imports: [BullModule.registerQueue({ name: 'automation-retry' })],
  controllers: [AutomationEventsController],
  providers: [AutomationEventsService, AutomationRetryProcessor],
  exports: [AutomationEventsService],
})
export class AutomationEventsModule {}
