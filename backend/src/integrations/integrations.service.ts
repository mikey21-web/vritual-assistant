import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HubspotAdapter, SalesforceAdapter, ZohoAdapter } from '../shared/adapters/crm.adapter';
import { WhatsAppCloudAdapter, TelegramBotAdapter } from '../shared/adapters/messaging.adapter';
import { TwilioSmsAdapter } from '../shared/adapters/sms.adapter';
import { CalendlyAdapter, GoogleCalendarAdapter } from '../shared/adapters/calendar.adapter';
import { CircuitBreaker } from '../shared/circuit-breaker';
import { envelopeEncrypt, envelopeDecrypt, isEncrypted } from '../shared/crypto.util';

const SECRET_FIELDS = ['apiKey', 'apiSecret', 'secret', 'token', 'password', 'accessToken', 'privateKey', 'clientSecret', 'authToken', 'refreshToken'];

function redactSecrets(config: any): any {
  if (!config || typeof config !== 'object') return config;
  const result: any = Array.isArray(config) ? [] : {};
  for (const [key, value] of Object.entries(config)) {
    if (SECRET_FIELDS.includes(key)) result[key] = '***REDACTED***';
    else if (typeof value === 'object' && value !== null) result[key] = redactSecrets(value);
    else result[key] = value;
  }
  return result;
}

@Injectable()
export class IntegrationsService {
  private readonly logger = new Logger(IntegrationsService.name);

  constructor(
    private prisma: PrismaService,
    private hubspot: HubspotAdapter,
    private salesforce: SalesforceAdapter,
    private zoho: ZohoAdapter,
    private whatsApp: WhatsAppCloudAdapter,
    private telegram: TelegramBotAdapter,
    private twilioSms: TwilioSmsAdapter,
    private calendly: CalendlyAdapter,
    private googleCalendar: GoogleCalendarAdapter,
  ) {}

  findAll(query: any = {}) {
    const { page = 1, limit = 50 } = query;
    return Promise.all([
      this.prisma.integration.findMany({ skip: (+page - 1) * +limit, take: +limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.integration.count(),
    ]).then(([data, total]) => ({ data: data.map(r => ({ ...r, config: redactSecrets(r.config) })), meta: { total, page: +page, limit: +limit } }));
  }

  async findOne(id: string) { const i = await this.prisma.integration.findUnique({ where: { id } }); if (!i) throw new NotFoundException('Integration not found'); return { ...i, config: redactSecrets(i.config) }; }
  create(data: any) { return this.prisma.integration.create({ data: { ...data, config: envelopeEncrypt(data.config) } }).then(r => ({ ...r, config: redactSecrets(r.config) })); }
  async update(id: string, data: any) { await this.findOne(id); const payload = { ...data }; if (payload.config) payload.config = envelopeEncrypt(payload.config); return this.prisma.integration.update({ where: { id }, data: payload }).then(r => ({ ...r, config: redactSecrets(r.config) })); }
  async remove(id: string) { await this.findOne(id); return this.prisma.integration.delete({ where: { id } }); }

  async migratePlaintextConfigs(): Promise<{ migrated: number; skipped: number }> {
    const all = await this.prisma.integration.findMany();
    let migrated = 0;
    let skipped = 0;
    for (const row of all) {
      const config = row.config as any;
      if (!config || typeof config !== 'object') { skipped++; continue; }
      let needsEncrypt = false;
      for (const key of SECRET_FIELDS) {
        if (typeof config[key] === 'string' && config[key] && !isEncrypted(config[key])) {
          needsEncrypt = true;
          break;
        }
      }
      if (!needsEncrypt) { skipped++; continue; }
      await this.prisma.integration.update({
        where: { id: row.id },
        data: { config: envelopeEncrypt(config) },
      });
      migrated++;
    }
    return { migrated, skipped };
  }

  async test(id: string) {
    const integration = await this.prisma.integration.findUnique({ where: { id } });
    if (!integration) throw new NotFoundException('Integration not found');

    const config = envelopeDecrypt(integration.config as any);
    let isHealthy = false;

    const breaker = new CircuitBreaker(`health-${integration.type}-${id}`, 3, 15000);

    switch (integration.type) {
      case 'HUBSPOT': isHealthy = await breaker.call(() => this.hubspot.healthCheck(config), () => Promise.resolve(false)); break;
      case 'SALESFORCE': isHealthy = await breaker.call(() => this.salesforce.healthCheck(config), () => Promise.resolve(false)); break;
      case 'ZOHO': isHealthy = await breaker.call(() => this.zoho.healthCheck(config), () => Promise.resolve(false)); break;
      case 'WHATSAPP':
      case 'WHATSAPP_CLOUD_API': isHealthy = await breaker.call(() => this.whatsApp.healthCheck(config), () => Promise.resolve(false)); break;
      case 'TELEGRAM': isHealthy = await breaker.call(() => this.telegram.healthCheck(config), () => Promise.resolve(false)); break;
      case 'TWILIO':
      case 'TWILIO_SMS':
        isHealthy = !!config?.TWILIO_ACCOUNT_SID;
        if (!isHealthy) this.logger.warn(`Twilio SMS health check: missing TWILIO_ACCOUNT_SID`);
        break;
      case 'CALENDLY': isHealthy = await breaker.call(() => this.calendly.healthCheck(config), () => Promise.resolve(false)); break;
      case 'GOOGLE_CALENDAR': isHealthy = await breaker.call(() => this.googleCalendar.healthCheck(config), () => Promise.resolve(false)); break;
      case 'STRIPE':
        isHealthy = !!config?.secretKey || !!config?.STRIPE_SECRET_KEY;
        break;
      case 'SMTP':
        isHealthy = !!config?.host && !!config?.port;
        break;
      default: return { name: integration.name, type: integration.type, status: 'unsupported' as const, testedAt: new Date() };
    }

    const newStatus = isHealthy ? 'connected' : 'disconnected';
    await this.prisma.integration.update({ where: { id }, data: { lastTested: new Date(), status: newStatus } });
    return { name: integration.name, type: integration.type, status: newStatus, testedAt: new Date() };
  }
}
