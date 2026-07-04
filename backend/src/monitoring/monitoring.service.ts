import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { HubspotAdapter, SalesforceAdapter, ZohoAdapter } from '../shared/adapters/crm.adapter';
import { WhatsAppCloudAdapter, TelegramBotAdapter } from '../shared/adapters/messaging.adapter';
import { TwilioSmsAdapter } from '../shared/adapters/sms.adapter';
import { CalendlyAdapter, GoogleCalendarAdapter } from '../shared/adapters/calendar.adapter';
import { EmailAdapter } from '../shared/adapters/email.adapter';
import { envelopeDecrypt } from '../shared/crypto.util';

export interface DependencyStatus {
  status: 'ok' | 'degraded' | 'down' | 'unconfigured';
  latencyMs?: number;
  detail?: string;
}

export interface ServiceCheckReport {
  service: string;
  status: 'ok' | 'degraded' | 'down' | 'unconfigured';
  latencyMs?: number;
  detail?: string;
  checkedAt: string;
}

export interface HealthReport {
  status: 'ok' | 'degraded' | 'down';
  timestamp: string;
  uptime: number;
  version: string;
  services: ServiceCheckReport[];
  summary: {
    total: number;
    ok: number;
    degraded: number;
    down: number;
    unconfigured: number;
  };
}

const CRM_TYPE_MAP: Record<string, string> = {
  HUBSPOT: 'HUBSPOT',
  SALESFORCE: 'SALESFORCE',
  ZOHO: 'ZOHO',
};

@Injectable()
export class MonitoringService {
  private readonly logger = new Logger(MonitoringService.name);
  private readonly startTime: number = Date.now();

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    @InjectQueue('monitoring') private monitoringQueue: Queue,
    private hubspot: HubspotAdapter,
    private salesforce: SalesforceAdapter,
    private zoho: ZohoAdapter,
    private whatsApp: WhatsAppCloudAdapter,
    private telegram: TelegramBotAdapter,
    private twilioSms: TwilioSmsAdapter,
    private calendly: CalendlyAdapter,
    private googleCalendar: GoogleCalendarAdapter,
    private email: EmailAdapter,
  ) {}

  async checkAll(): Promise<HealthReport> {
    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkQueueLatency(),
      this.checkIntegrations(),
      this.checkEmail(),
    ]);

    const services: ServiceCheckReport[] = [];
    for (const result of checks) {
      if (result.status === 'fulfilled') {
        if (Array.isArray(result.value)) {
          services.push(...result.value);
        } else {
          services.push(result.value);
        }
      } else {
        services.push({
          service: 'unknown',
          status: 'down',
          detail: result.reason?.message || 'Check failed unexpectedly',
          checkedAt: new Date().toISOString(),
        });
      }
    }

    const summary = this.computeSummary(services);
    const overallStatus = summary.down > 0 ? 'down' : summary.degraded > 0 ? 'degraded' : 'ok';

    // Record checkpoint in DB
    for (const svc of services) {
      await this.recordCheckpoint(svc.service, svc.status, svc.latencyMs).catch(() => {});
    }

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: this.getUptime(),
      version: process.env.npm_package_version || '1.0.0',
      services,
      summary,
    };
  }

  private computeSummary(services: ServiceCheckReport[]) {
    const summary = { total: services.length, ok: 0, degraded: 0, down: 0, unconfigured: 0 };
    for (const s of services) {
      if (s.status === 'ok') summary.ok++;
      else if (s.status === 'degraded') summary.degraded++;
      else if (s.status === 'down') summary.down++;
      else if (s.status === 'unconfigured') summary.unconfigured++;
    }
    return summary;
  }

  async checkDatabase(): Promise<ServiceCheckReport> {
    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        service: 'database',
        status: 'ok',
        latencyMs: Date.now() - start,
        detail: 'PostgreSQL reachable',
        checkedAt: new Date().toISOString(),
      };
    } catch (e: any) {
      return {
        service: 'database',
        status: 'down',
        detail: e.message || 'Database unavailable',
        checkedAt: new Date().toISOString(),
      };
    }
  }

  async checkRedis(): Promise<ServiceCheckReport> {
    const redisUrl = this.config.get<string>('REDIS_URL');
    if (!redisUrl) {
      return {
        service: 'redis',
        status: 'unconfigured',
        detail: 'REDIS_URL not set',
        checkedAt: new Date().toISOString(),
      };
    }

    const start = Date.now();
    try {
      const { Redis } = require('ioredis');
      const redis = new Redis(redisUrl, { lazyConnect: true, maxRetriesPerRequest: 1, connectTimeout: 3000 });
      const pong = await redis.ping();
      await redis.quit();
      return {
        service: 'redis',
        status: pong === 'PONG' ? 'ok' : 'degraded',
        latencyMs: Date.now() - start,
        detail: pong === 'PONG' ? 'ping OK' : 'ping returned unexpected response',
        checkedAt: new Date().toISOString(),
      };
    } catch (e: any) {
      return {
        service: 'redis',
        status: 'down',
        detail: e.message || 'Connection failed',
        checkedAt: new Date().toISOString(),
      };
    }
  }

  async checkQueueLatency(): Promise<ServiceCheckReport> {
    const start = Date.now();
    try {
      const job = await this.monitoringQueue.add('health-ping', { ping: Date.now() });
      const waited = Date.now() - start;
      return {
        service: 'queue',
        status: 'ok',
        latencyMs: waited,
        detail: 'BullMQ queue reachable',
        checkedAt: new Date().toISOString(),
      };
    } catch (e: any) {
      return {
        service: 'queue',
        status: 'down',
        detail: e.message || 'Queue unavailable',
        checkedAt: new Date().toISOString(),
      };
    }
  }

  async checkIntegrations(): Promise<ServiceCheckReport[]> {
    const results: ServiceCheckReport[] = [];
    const integrations = await this.prisma.integration.findMany({
      where: { isActive: true },
    });

    for (const integration of integrations) {
      const start = Date.now();
      const config = envelopeDecrypt(integration.config as any);
      let healthy = false;
      let detail = '';

      try {
        switch (integration.type) {
          case 'HUBSPOT':
            healthy = await this.hubspot.healthCheck(config);
            detail = healthy ? 'API reachable' : 'API auth failed';
            break;
          case 'SALESFORCE':
            healthy = await this.salesforce.healthCheck(config);
            detail = healthy ? 'Auth token issued' : 'OAuth failed';
            break;
          case 'ZOHO':
            healthy = await this.zoho.healthCheck(config);
            detail = healthy ? 'Auth token issued' : 'OAuth failed';
            break;
          case 'WHATSAPP':
            healthy = await this.whatsApp.healthCheck(config);
            detail = healthy ? 'API reachable' : 'API auth failed';
            break;
          case 'TELEGRAM':
            healthy = await this.telegram.healthCheck(config);
            detail = healthy ? 'Bot reachable' : 'Bot token invalid';
            break;
          case 'TWILIO_SMS':
            healthy = !!config?.TWILIO_ACCOUNT_SID;
            detail = healthy ? 'SID configured' : 'TWILIO_ACCOUNT_SID not set';
            break;
          case 'CALENDLY':
            healthy = await this.calendly.healthCheck(config);
            detail = healthy ? 'API reachable' : 'API auth failed';
            break;
          case 'GOOGLE_CALENDAR':
            healthy = await this.googleCalendar.healthCheck(config);
            detail = healthy ? 'API reachable' : 'API auth failed';
            break;
          default:
            detail = `Unsupported integration type: ${integration.type}`;
            break;
        }
      } catch (e: any) {
        healthy = false;
        detail = e.message || 'Check threw exception';
      }

      results.push({
        service: `integration:${integration.type}`,
        status: healthy ? 'ok' : 'down',
        latencyMs: Date.now() - start,
        detail: detail || (healthy ? 'connected' : 'unreachable'),
        checkedAt: new Date().toISOString(),
      });
    }

    if (integrations.length === 0) {
      results.push({
        service: 'integrations',
        status: 'unconfigured',
        detail: 'No active integrations configured',
        checkedAt: new Date().toISOString(),
      });
    }

    return results;
  }

  async checkEmail(): Promise<ServiceCheckReport> {
    const start = Date.now();
    try {
      const ok = await this.email.healthCheck();
      if (!ok) {
        return {
          service: 'email',
          status: 'unconfigured',
          detail: 'SMTP not configured (set SMTP_HOST, SMTP_USER)',
          checkedAt: new Date().toISOString(),
        };
      }
      return {
        service: 'email',
        status: 'ok',
        latencyMs: Date.now() - start,
        detail: 'SMTP configured',
        checkedAt: new Date().toISOString(),
      };
    } catch (e: any) {
      return {
        service: 'email',
        status: 'down',
        detail: e.message || 'SMTP check failed',
        checkedAt: new Date().toISOString(),
      };
    }
  }

  async getSimpleStatus(): Promise<{ status: string; timestamp: string }> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', timestamp: new Date().toISOString() };
    } catch {
      return { status: 'degraded', timestamp: new Date().toISOString() };
    }
  }

  getUptime(): number {
    return Math.floor((Date.now() - this.startTime) / 1000);
  }

  async recordCheckpoint(service: string, status: string, latencyMs?: number): Promise<void> {
    try {
      await this.prisma.healthCheck.create({
        data: { service, status, latencyMs },
      });
    } catch (e: any) {
      this.logger.warn(`Failed to record health checkpoint for ${service}: ${e.message}`);
    }
  }
}
