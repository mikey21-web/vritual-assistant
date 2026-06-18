import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

export interface DependencyStatus {
  status: 'ok' | 'error' | 'unconfigured';
  latencyMs?: number;
  detail?: string;
}

export interface HealthReport {
  status: 'ok' | 'degraded' | 'down';
  timestamp: string;
  version: string;
  uptime: number;
  dependencies: Record<string, DependencyStatus>;
}

@Injectable()
export class HealthService {
  constructor(private prisma: PrismaService, private config: ConfigService) {}

  async check() {
    let dbOk = false;
    try { await this.prisma.$queryRaw`SELECT 1`; dbOk = true; } catch {}

    return {
      status: dbOk ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      checks: {
        database: dbOk ? 'connected' : 'disconnected',
        uptime: Number(process.uptime().toFixed(1)),
        memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      },
    };
  }

  async shallow(): Promise<{ status: string; timestamp: string }> {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  async deep(): Promise<HealthReport> {
    const deps: Record<string, DependencyStatus> = {};

    deps.database = await this.checkDatabase();

    const redisUrl = this.config.get<string>('REDIS_URL');
    deps.redis = redisUrl
      ? { status: 'ok', detail: 'configured' }
      : { status: 'unconfigured', detail: 'REDIS_URL not set' };

    const n8nUrl = this.config.get<string>('N8N_BACKEND_API_URL') || this.config.get<string>('N8N_WEBHOOK_URL') || 'http://n8n:5678';
    deps.n8n = await this.checkUrl(n8nUrl, '/healthz');

    const storageProvider = this.config.get<string>('STORAGE_PROVIDER') || 'local';
    deps.storage = { status: 'ok', detail: `provider: ${storageProvider}` };

    const waSecret = this.config.get<string>('WHATSAPP_APP_SECRET');
    deps.whatsapp = waSecret
      ? { status: 'ok', detail: 'app secret configured' }
      : { status: 'unconfigured', detail: 'WHATSAPP_APP_SECRET not set' };

    const stripeSecret = this.config.get<string>('STRIPE_WEBHOOK_SECRET');
    deps.stripe = stripeSecret
      ? { status: 'ok', detail: 'webhook secret configured' }
      : { status: 'unconfigured', detail: 'STRIPE_WEBHOOK_SECRET not set' };

    const hubspotKey = this.config.get<string>('HUBSPOT_API_KEY');
    deps.hubspot = hubspotKey
      ? { status: 'ok', detail: 'api key configured' }
      : { status: 'unconfigured', detail: 'HUBSPOT_API_KEY not set' };

    const hasError = Object.values(deps).some(d => d.status === 'error');
    const overallStatus = hasError ? 'degraded' : 'ok';

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime(),
      dependencies: deps,
    };
  }

  private async checkDatabase(): Promise<DependencyStatus> {
    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', latencyMs: Date.now() - start };
    } catch (e: any) {
      return { status: 'error', detail: 'database unavailable' };
    }
  }

  private async checkUrl(baseUrl: string, path: string): Promise<DependencyStatus> {
    const start = Date.now();
    try {
      const res = await fetch(`${baseUrl}${path}`, { signal: AbortSignal.timeout(3000) });
      return res.ok
        ? { status: 'ok', latencyMs: Date.now() - start }
        : { status: 'error', detail: `unreachable` };
    } catch (e: any) {
      return { status: 'error', detail: 'unreachable' };
    }
  }
}
