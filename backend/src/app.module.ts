import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { BullModule } from '@nestjs/bullmq';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RolesGuard } from './auth/roles.guard';

import { PrismaModule } from './prisma/prisma.module';
import { SharedModule } from './shared/shared.module';
import { AuthModule } from './auth/auth.module';
import { BusinessSettingsModule } from './business-settings/business-settings.module';
import { UsersModule } from './users/users.module';
import { ContactsModule } from './contacts/contacts.module';
import { LeadsModule } from './leads/leads.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { FormsModule } from './forms/forms.module';
import { QrCodesModule } from './qr-codes/qr-codes.module';
import { ConversationsModule } from './conversations/conversations.module';
import { MessageTemplatesModule } from './message-templates/message-templates.module';
import { MediaModule } from './media/media.module';
import { NurtureSequencesModule } from './nurture-sequences/nurture-sequences.module';
import { ScoringRulesModule } from './scoring-rules/scoring-rules.module';
import { RoutingRulesModule } from './routing-rules/routing-rules.module';
import { TasksModule } from './tasks/tasks.module';
import { EventsOpsModule } from './events-ops/events-ops.module';
import { ClientFinanceModule } from './client-finance/client-finance.module';
import { ProcurementModule } from './procurement/procurement.module';
import { InventoryModule } from './inventory/inventory.module';
import { TeamOpsModule } from './team-ops/team-ops.module';
import { ModulePermissionsModule } from './module-permissions/module-permissions.module';
import { PublicProfileModule } from './public-profile/public-profile.module';
import { ConversionsModule } from './conversions/conversions.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { CrmMappingsModule } from './crm-mappings/crm-mappings.module';
import { BookingSettingsModule } from './booking-settings/booking-settings.module';
import { AutomationEventsModule } from './automation-events/automation-events.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { CustomFieldsModule } from './custom-fields/custom-fields.module';
import { AdvancedFeaturesModule } from './advanced-features/advanced-features.module';
import { EventsModule } from './events/events.module';
import { TimelineModule } from './timeline/timeline.module';
import { FailuresModule } from './failures/failures.module';
import { RulesModule } from './rules/rules.module';
import { AutomationModule } from './automation/automation.module';
import { BootstrapModule } from './bootstrap/bootstrap.module';
import { BillingModule } from './billing/billing.module';
import { ComplianceModule } from './compliance/compliance.module';
import { PermissionsModule } from './permissions/permissions.module';
import { AgentModule } from './agent/agent.module';
import { MonitoringModule } from './monitoring/monitoring.module';
import { TenantsModule } from './tenants/tenants.module';
import { AdminModule } from './admin/admin.module';
import { RealtimeModule } from './realtime/realtime.module';
import { TicketsModule } from './tickets/tickets.module';
import { CopilotModule } from './copilot/copilot.module';
import { ChatModule } from './chat/chat.module';
import { ReportsModule } from './reports/reports.module';
import { TelephonyModule } from './telephony/telephony.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AdIntegrationsModule } from './ad-integrations/ad-integrations.module';
import { WebsiteCrawlerModule } from './website-crawler/website-crawler.module';
import { LeadIntelligenceModule } from './lead-intelligence/lead-intelligence.module';
import { KhojClientModule } from './khoj-client/khoj-client.module';
import { MarketMonitorModule } from './market-monitor/market-monitor.module';
import { MikeyModule } from './mikey/mikey.module';
import { CallTrackingModule } from './call-tracking/call-tracking.module';
import { PortalIntegrationsModule } from './portal-integrations/portal-integrations.module';
import { BookingsModule } from './bookings/bookings.module';
import { PropertiesModule } from './properties/properties.module';
import { ShipmentsModule } from './shipments/shipments.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [() => ({ khoj: { baseUrl: process.env.KHOJ_BASE_URL || 'http://localhost:42111', timeout: parseInt(process.env.KHOJ_TIMEOUT || '30000', 10) } })] }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 300 }]),
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: config.get<string>('JWT_EXPIRATION', '24h') },
      }),
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: { url: config.get<string>('REDIS_URL') },
      }),
    }),
    PrismaModule,
    SharedModule,
    AuthModule,
    BusinessSettingsModule,
    UsersModule,
    ContactsModule,
    LeadsModule,
    CampaignsModule,
    FormsModule,
    QrCodesModule,
    ConversationsModule,
    MessageTemplatesModule,
    MediaModule,
    NurtureSequencesModule,
    ScoringRulesModule,
    RoutingRulesModule,
    TasksModule,
    EventsOpsModule,
    ClientFinanceModule,
    ProcurementModule,
    InventoryModule,
    TeamOpsModule,
    ModulePermissionsModule,
    PublicProfileModule,
    ConversionsModule,
    BookingsModule,
    PropertiesModule,
    ShipmentsModule,
    IntegrationsModule,
    CrmMappingsModule,
    BookingSettingsModule,
    AutomationEventsModule,
    WebhooksModule,
    AnalyticsModule,
    AuditLogsModule,
    CustomFieldsModule,
    AdvancedFeaturesModule,
    EventsModule,
    TimelineModule,
    FailuresModule,
    RulesModule,
    BootstrapModule,
    AutomationModule,
    BillingModule,
    ComplianceModule,
    PermissionsModule,
    AgentModule,
    MonitoringModule,
    TenantsModule,
    AdminModule,
    RealtimeModule,
    TicketsModule,
    CopilotModule,
    ChatModule,
    ReportsModule,
    TelephonyModule,
    NotificationsModule,
    AdIntegrationsModule,
    WebsiteCrawlerModule,
    LeadIntelligenceModule,
    KhojClientModule,
    MarketMonitorModule,
    MikeyModule,
    CallTrackingModule,
    PortalIntegrationsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}

