import { Module } from '@nestjs/common';
import { MikeySchedulerService } from './mikey-scheduler.service';
import { OutcomeEngineService } from './outcome-engine.service';
import { MikeyService } from './mikey.service';
import { TemporalStrategyService } from './temporal-strategy.service';
import { StaffAwarenessService } from './staff-awareness.service';
import { MetaCycleService } from './meta-cycle.service';
import { MikeyController } from './mikey.controller';

@Module({
  controllers: [MikeyController],
  providers: [
    MikeySchedulerService,
    OutcomeEngineService,
    MikeyService,
    TemporalStrategyService,
    StaffAwarenessService,
    MetaCycleService,
  ],
  exports: [
    MikeyService,
    OutcomeEngineService,
    TemporalStrategyService,
    StaffAwarenessService,
    MetaCycleService,
  ],
})
export class MikeyModule {}

