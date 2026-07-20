import { Module } from '@nestjs/common';
import { BookingsModule } from '../bookings/bookings.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { ApprovalsModule } from '../approvals/approvals.module';
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
import { DailyBriefService } from './daily-brief.service';
import { SalienceEngineService } from './salience-engine.service';
import { AutonomyGuardrailsService } from './autonomy-guardrails.service';
import { AutonomousActionService } from './autonomous-action.service';
import { AutonomousActionController } from './autonomous-action.controller';
import { OutcomeEngineService } from './outcome-engine.service';
import { MikeyService } from './mikey.service';
import { TemporalStrategyService } from './temporal-strategy.service';
import { StaffAwarenessService } from './staff-awareness.service';
import { MemoryService } from './memory.service';
import { MemoryController } from './memory.controller';
import { NicheScannerService } from './niche-scanner.service';
import { NicheActionService } from './niche-action.service';
import { MikeyController } from './mikey.controller';
import { GuardrailsController } from './guardrails.controller';

@Module({
  imports: [
    BookingsModule, AnalyticsModule, ConversationsModule, SiteVisitsModule, UnitHoldsModule, SlaModule,
    CostSheetsModule, OffersModule, DocumentsModule, ChannelPartnerClaimsModule, TicketsModule, ApprovalsModule,
  ],
  controllers: [MikeyController, MemoryController, AutonomousActionController, JarvisToolsController, GuardrailsController],
  providers: [
    JarvisToolsService,
    MikeySchedulerService,
    MorningDigestService,
    DailyBriefService,
    OutcomeEngineService,
    MikeyService,
    TemporalStrategyService,
    StaffAwarenessService,
    MemoryService,
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
    MemoryService,
    AutonomousActionService,
    AutonomyGuardrailsService,
  ],
})
export class MikeyModule {}
