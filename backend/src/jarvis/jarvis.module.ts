import { Module } from '@nestjs/common';
import { JarvisSchedulerService } from './jarvis-scheduler.service';
import { OutcomeEngineService } from './outcome-engine.service';
import { JarvisService } from './jarvis.service';
import { TemporalStrategyService } from './temporal-strategy.service';
import { StaffAwarenessService } from './staff-awareness.service';
import { MetaCycleService } from './meta-cycle.service';
import { JarvisController } from './jarvis.controller';

@Module({
  controllers: [JarvisController],
  providers: [
    JarvisSchedulerService,
    OutcomeEngineService,
    JarvisService,
    TemporalStrategyService,
    StaffAwarenessService,
    MetaCycleService,
  ],
  exports: [
    JarvisService,
    OutcomeEngineService,
    TemporalStrategyService,
    StaffAwarenessService,
    MetaCycleService,
  ],
})
export class JarvisModule {}
