import { Global, Module } from '@nestjs/common';
import { SignedUrlService } from './signed-url.service';
import { OutboxService } from './outbox.service';
import { WebhookSecurityService } from './webhook-security.service';
import { HealthService } from './health.service';
import { PackApplierService } from './pack-applier.service';
import { FeatureFlagsService } from './feature-flags.service';
import { AlertingService } from './alerting.service';
import { NormalizationService } from './normalization.service';
import { GracefulDegradationService } from './graceful-degradation.service';
import { HubspotAdapter, SalesforceAdapter, ZohoAdapter } from './adapters/crm.adapter';
import { CalendlyAdapter, GoogleCalendarAdapter } from './adapters/calendar.adapter';
import { WhatsAppCloudAdapter } from './adapters/messaging.adapter';
import { TwilioSmsAdapter } from './adapters/sms.adapter';
import { EmailAdapter } from './adapters/email.adapter';
import { HealthController } from './health.controller';
import { SentryService } from './sentry.service';

@Global()
@Module({
  controllers: [HealthController],
  providers: [
    SignedUrlService, WebhookSecurityService, HealthService, PackApplierService,
    FeatureFlagsService, AlertingService, NormalizationService, GracefulDegradationService,
    HubspotAdapter, SalesforceAdapter, ZohoAdapter,
    CalendlyAdapter, GoogleCalendarAdapter,
    WhatsAppCloudAdapter, TwilioSmsAdapter, EmailAdapter, OutboxService,
    SentryService,
  ],
  exports: [
    SignedUrlService, WebhookSecurityService, HealthService, PackApplierService,
    FeatureFlagsService, AlertingService, NormalizationService, GracefulDegradationService,
    HubspotAdapter, SalesforceAdapter, ZohoAdapter,
    CalendlyAdapter, GoogleCalendarAdapter,
    WhatsAppCloudAdapter, TwilioSmsAdapter, EmailAdapter, OutboxService,
    SentryService,
  ],
})
export class SharedModule {}
