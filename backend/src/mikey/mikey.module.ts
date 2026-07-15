import { Module } from '@nestjs/common';
import { MikeySchedulerService } from './mikey-scheduler.service';
import { OutcomeEngineService } from './outcome-engine.service';
import { MikeyService } from './mikey.service';
import { TemporalStrategyService } from './temporal-strategy.service';
import { StaffAwarenessService } from './staff-awareness.service';
import { MetaCycleService } from './meta-cycle.service';
import { MemoryService } from './memory.service';
import { MemoryController } from './memory.controller';
import { ReflexionService } from './reflexion.service';
import { ReflexionController } from './reflexion.controller';
import { FederatedService } from './federated.service';
import { FederatedController } from './federated.controller';
import { AggregatorController } from './aggregator.controller';
import { EmbeddingService } from './embedding.service';
import { NicheScannerService } from './niche-scanner.service';
import { NicheActionService } from './niche-action.service';
import { MikeyController } from './mikey.controller';

@Module({
  controllers: [MikeyController, MemoryController, ReflexionController, FederatedController, AggregatorController],
  providers: [
    MikeySchedulerService,
    OutcomeEngineService,
    MikeyService,
    TemporalStrategyService,
    StaffAwarenessService,
    MetaCycleService,
    MemoryService,
    EmbeddingService,
    ReflexionService,
    FederatedService,
    NicheScannerService,
    NicheActionService,
  ],
  exports: [
    MikeyService,
    OutcomeEngineService,
    TemporalStrategyService,
    StaffAwarenessService,
    MetaCycleService,
    MemoryService,
    EmbeddingService,
    ReflexionService,
    FederatedService,
  ],
})
export class MikeyModule {}

