import { Module } from '@nestjs/common';
import { EventsOpsService } from './events-ops.service';
import { EventsOpsController } from './events-ops.controller';

@Module({
  controllers: [EventsOpsController],
  providers: [EventsOpsService],
  exports: [EventsOpsService],
})
export class EventsOpsModule {}
