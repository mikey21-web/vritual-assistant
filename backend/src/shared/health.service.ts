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
      ? await this.checkRedis()
      : { status: 'unconfigured', detail: 'REDIS_URL not set' };

    const n8nUrl = this.config.get<string>('N8N_BACKEND_API_URL') || this.config.get<string>('N8N_WEBHOOK_URL') || 'http://n8n:5678';
    deps.n8n = await this.checkN8(n8nUrl);

    const storageProvider = this.config.get<string>('STORAGE_PROVIDER') || 'local';
    deps.storage = { status: 'ok', detail: `provider: ${storageProvider}` };

    const waSecret = this.config.get<string>('WHATSAPP_APP_SECRET');
    deps.whatsapp = waSecret
      ? { status: 'ok', detail: 'app secret configured' }
      : { status: 'unconfigured', detail: 'WHATSAPP_APP_SECRET not set' };

    const tgToken = this.config.get<string>('TELEGRAM_BOT_TOKEN');
    deps.telegram = tgToken
      ? { status: 'ok', detail: 'bot token configured' }
      : { status: 'unconfigured', detail: 'TELEGRAM_BOT_TOKEN not set' };

    const stripeSecret = this.config.get<string>('STRIPE_WEBHOOK_SECRET');
    deps.stripe = stripeSecret
      ? { status: 'ok', detail: 'webhook secret configured' }
      : { status: 'unconfigured', detail: 'STRIPE_WEBHOOK_SECRET not set' };

    const hubspotKey = this.config.get<string>('HUBSPOT_API_KEY');
    deps.hubspot = hubspotKey
      ? { status: 'ok', detail: 'api key configured' }
      : { status: 'unconfigured', detail: 'HUBSPOT_API_KEY not set' };

    // Claude API health check
    const claudeKey = this.config.get<string>('ANTHROPIC_API_KEY');
    deps.claude = claudeKey
      ? await this.checkClaude(claudeKey)
      : { status: 'unconfigured', detail: 'ANTHROPIC_API_KEY not set' };

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

  private async checkRedis(): Promise<DependencyStatus> {
    const redisUrl = this.config.get<string>('REDIS_URL');
    if (!redisUrl) return { status: 'unconfigured', detail: 'REDIS_URL not set' };
    const start = Date.now();
    try {
      // Redis reachable check via BullMQ or ioredis ping
      const { Redis } = require('ioredis');
      const redis = new Redis(redisUrl, { lazyConnect: true, maxRetriesPerRequest: 1, connectTimeout: 3000 });
      const pong = await redis.ping();
      await redis.quit();
      return pong === 'PONG'
        ? { status: 'ok', latencyMs: Date.now() - start, detail: 'ping OK' }
        : { status: 'error', detail: 'ping failed' };
    } catch (e: any) {
      if (e.code === 'ECONNREFUSED') return { status: 'error', detail: 'connection refused' };
      if (e.code === 'ENOTFOUND') return { status: 'error', detail: 'DNS resolution failed' };
      if (e.message?.includes('timeout')) return { status: 'error', detail: 'connection timeout' };
      return { status: 'error', detail: e.message || 'unreachable' };
    }
  }

  private async checkN8(baseUrl: string): Promise<DependencyStatus> {
    const start = Date.now();
    try {
      const authUser = this.config.get<string>('N8N_BASIC_AUTH_USER');
      const authPass = this.config.get<string>('N8N_PASSWORD');
      const headers: Record<string, string> = {};
      if (authUser && authPass) {
        headers['Authorization'] = 'Basic ' + Buffer.from(`${authUser}:${authPass}`).toString('base64');
      }
      const res = await fetch(`${baseUrl}/healthz`, { headers, signal: AbortSignal.timeout(3000) });
      if (res.ok) return { status: 'ok', latencyMs: Date.now() - start, detail: 'reachable' };
      if (res.status === 401 || res.status === 403) return { status: 'error', detail: 'auth failed — check N8N credentials' };
      if (res.status === 404) return { status: 'error', detail: 'unreachable — healthz not found' };
      return { status: 'error', detail: `HTTP ${res.status}` };
    } catch (e: any) {
      if (e.code === 'ECONNREFUSED') return { status: 'error', detail: 'connection refused' };
      if (e.code === 'ENOTFOUND') return { status: 'error', detail: 'DNS resolution failed' };
      if (e.message?.includes('timeout')) return { status: 'error', detail: 'connection timeout' };
      return { status: 'error', detail: e.message || 'unreachable' };
    }
  }

  private async checkClaude(apiKey: string): Promise<DependencyStatus> {
    const start = Date.now();
    if (!apiKey || apiKey.startsWith('sk-ant-placeholder')) {
      return { status: 'unconfigured', detail: 'ANTHROPIC_API_KEY set but appears to be a placeholder' };
    }
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 1, messages: [{ role: 'user', content: 'ping' }] }),
        signal: AbortSignal.timeout(10000),
      });
      if (res.ok) return { status: 'ok', latencyMs: Date.now() - start, detail: 'API reachable' };
      if (res.status === 401) return { status: 'error', detail: 'auth failed — invalid API key' };
      if (res.status === 429) return { status: 'error', detail: 'rate limited' };
      return { status: 'error', detail: `HTTP ${res.status}` };
    } catch (e: any) {
      if (e.code === 'ECONNREFUSED' || e.code === 'ENOTFOUND') return { status: 'error', detail: 'DNS/connection failure' };
      if (e.message?.includes('timeout')) return { status: 'error', detail: 'timeout' };
      return { status: 'error', detail: e.message || 'unreachable' };
    }
  }
}
