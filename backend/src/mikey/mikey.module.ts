import { Module } from '@nestjs/common';
import { BookingsModule } from '../bookings/bookings.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { ConversationsModule } from '../conversations/conversations.module';
import { MikeySchedulerService } from './mikey-scheduler.service';
import { MorningDigestService } from './morning-digest.service';
import { SalienceEngineService } from './salience-engine.service';
import { AutonomyGuardrailsService } from './autonomy-guardrails.service';
import { AutonomousActionService } from './autonomous-action.service';
import { AutonomousActionController } from './autonomous-action.controller';
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
  imports: [BookingsModule, AnalyticsModule, ConversationsModule],
  controllers: [MikeyController, MemoryController, ReflexionController, FederatedController, AggregatorController, AutonomousActionController],
  providers: [
    MikeySchedulerService,
    MorningDigestService,
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
    SalienceEngineService,
    AutonomyGuardrailsService,
    AutonomousActionService,
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
    AutonomousActionService,
  ],
})
export class MikeyModule {}

