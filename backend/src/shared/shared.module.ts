import { Global, Module } from '@nestjs/common';
import { SignedUrlService } from './signed-url.service';
import { WebhookSecurityService } from './webhook-security.service';
import { HealthService } from './health.service';
import { PackApplierService } from './pack-applier.service';
import { TenantContextService } from './tenant-context.service';
import { HubspotAdapter, SalesforceAdapter, ZohoAdapter } from './adapters/crm.adapter';
import { CalendlyAdapter, GoogleCalendarAdapter } from './adapters/calendar.adapter';
import { WhatsAppCloudAdapter } from './adapters/messaging.adapter';
import { TwilioSmsAdapter } from './adapters/sms.adapter';
import { EmailAdapter } from './adapters/email.adapter';
import { HealthController } from './health.controller';

@Global()
@Module({
  controllers: [HealthController],
  providers: [
    SignedUrlService, WebhookSecurityService, HealthService, PackApplierService, TenantContextService,
    HubspotAdapter, SalesforceAdapter, ZohoAdapter,
    CalendlyAdapter, GoogleCalendarAdapter,
    WhatsAppCloudAdapter, TwilioSmsAdapter, EmailAdapter,
  ],
  exports: [
    SignedUrlService, WebhookSecurityService, HealthService, PackApplierService, TenantContextService,
    HubspotAdapter, SalesforceAdapter, ZohoAdapter,
    CalendlyAdapter, GoogleCalendarAdapter,
    WhatsAppCloudAdapter, TwilioSmsAdapter, EmailAdapter,
  ],
})
export class SharedModule {}
