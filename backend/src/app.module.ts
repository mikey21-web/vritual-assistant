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

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }]),
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
    ConversionsModule,
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
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
