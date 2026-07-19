import { Module } from '@nestjs/common';
import { BookingsModule } from '../bookings/bookings.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { ConversationsModule } from '../conversations/conversations.module';
import { SiteVisitsModule } from '../site-visits/site-visits.module';
import { UnitHoldsModule } from '../unit-holds/unit-holds.module';
import { SlaModule } from '../sla/sla.module';
import { CostSheetsModule } from '../cost-sheets/cost-sheets.module';
import { OffersModule } from '../offers/offers.module';
import { DocumentsModule } from '../documents/documents.module';
import { ChannelPartnerClaimsModule } from '../channel-partner-claims/channel-partner-claims.module';
import { TicketsModule } from '../tickets/tickets.module';
import { JarvisToolsService } from './jarvis-tools.service';
import { JarvisToolsController } from './jarvis-tools.controller';
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
  imports: [
    BookingsModule, AnalyticsModule, ConversationsModule, SiteVisitsModule, UnitHoldsModule, SlaModule,
    CostSheetsModule, OffersModule, DocumentsModule, ChannelPartnerClaimsModule, TicketsModule,
  ],
  controllers: [MikeyController, MemoryController, ReflexionController, FederatedController, AggregatorController, AutonomousActionController, JarvisToolsController],
  providers: [
    JarvisToolsService,
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
    AutonomyGuardrailsService,
  ],
})
export class MikeyModule {}

