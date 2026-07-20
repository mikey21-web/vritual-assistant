import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { AlertingService, AlertSeverity } from './alerting.service';
import { MetricsService } from './metrics.service';

export interface CheckResult {
  name: string;
  passed: boolean;
  latencyMs: number;
  error?: string;
  timestamp: string;
}

@Injectable()
export class SyntheticCheckService {
  private readonly logger = new Logger(SyntheticCheckService.name);
  private readonly baseUrl: string;
  private readonly syntheticTenant: string;
  private createdLeadIds: string[] = [];

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
    private alerting: AlertingService,
    private metrics: MetricsService,
  ) {
    this.baseUrl = this.config.get<string>('INTERNAL_API_URL', 'http://localhost:3001');
    this.syntheticTenant = this.config.get<string>('SYNTHETIC_TENANT_ID', 'default-tenant');
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async checkLiveness(): Promise<void> {
    const result = await this.httpCheck('/health/live');
    this.record('liveness_check', result);
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async checkReadiness(): Promise<void> {
    const result = await this.httpCheck('/health/ready');
    this.record('readiness_check', result);
  }

  @Cron('*/15 * * * *')
  async checkDeepHealth(): Promise<void> {
    const result = await this.httpCheck('/health/deep', 30000);
    this.record('deep_health_check', result);
  }

  @Cron('*/30 * * * *')
  async checkLeadJourney(): Promise<void> {
    const result = await this.runLeadLifecycle();
    this.record('lead_journey', result);
  }

  @Cron('0 * * * *')
  async checkFullSystem(): Promise<void> {
    const results = await Promise.all([
      this.httpCheck('/health/live'),
      this.httpCheck('/health/ready'),
      this.httpCheck('/health/deep', 30000),
      this.runLeadLifecycle(),
    ]);
    const failures = results.filter(r => !r.passed);
    if (failures.length > 0) {
      await this.alert('full_system_check', `Failed ${failures.length}/${results.length} checks: ${failures.map(f => f.name).join(', ')}`, 'high');
    }
    for (const r of results) {
      this.metrics.observeHistogram('synthetic_check_duration_ms', r.latencyMs, { check: 'full_system', status: r.passed ? 'ok' : 'error' });
    }
  }

  async runAll(): Promise<{ passed: boolean; results: CheckResult[] }> {
    const results = await Promise.all([
      this.httpCheck('/health/live'),
      this.httpCheck('/health/ready'),
      this.httpCheck('/health/deep', 30000),
      this.runLeadLifecycle(),
    ]);
    return { passed: results.every(r => r.passed), results };
  }

  private async httpCheck(path: string, timeoutMs = 10000): Promise<CheckResult> {
    const start = Date.now();
    const name = path.replace(/^\//, '').replace(/[^a-z0-9]/gi, '_');
    try {
      const res = await fetch(`${this.baseUrl}${path}`, { signal: AbortSignal.timeout(timeoutMs) });
      const latencyMs = Date.now() - start;
      const passed = res.ok;
      if (!passed) this.metrics.incrementCounter('synthetic_check_failures_total', { check: name });
      return { name, passed, latencyMs, error: passed ? undefined : `HTTP ${res.status}`, timestamp: new Date().toISOString() };
    } catch (err: any) {
      const latencyMs = Date.now() - start;
      this.metrics.incrementCounter('synthetic_check_failures_total', { check: name });
      return { name, passed: false, latencyMs, error: err.message, timestamp: new Date().toISOString() };
    }
  }

  private async runLeadLifecycle(): Promise<CheckResult> {
    const start = Date.now();
    let leadId = '';
    try {
      const lead = await this.api('POST', '/leads', {
        tenantId: this.syntheticTenant,
        source: 'SYNTHETIC_MONITOR',
        contact: {
          name: `SynthMon ${new Date().toISOString().slice(0, 10)}`,
          phone: '+919000000001',
          email: `synth-${Date.now()}@monitor.leadauto.io`,
        },
        status: 'NEW',
      });
      leadId = lead.id;
      if (!leadId) throw new Error('No lead ID returned');

      const fetched = await this.api('GET', `/leads/${leadId}`);
      if (fetched.id !== leadId) throw new Error('Lead fetch returned wrong ID');

      return { name: 'lead_journey', passed: true, latencyMs: Date.now() - start, timestamp: new Date().toISOString() };
    } catch (err: any) {
      this.metrics.incrementCounter('synthetic_check_failures_total', { check: 'lead_journey' });
      return { name: 'lead_journey', passed: false, latencyMs: Date.now() - start, error: err.message, timestamp: new Date().toISOString() };
    } finally {
      if (leadId) {
        try { await this.api('DELETE', `/leads/${leadId}`); } catch {}
      }
    }
  }

  private async api(method: string, path: string, body?: unknown) {
    const url = `${this.baseUrl}${path}`;
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`${method} ${path} → ${res.status}: ${text.slice(0, 200)}`);
    }
    return res.json().catch(() => ({}));
  }

  private async record(name: string, result: CheckResult): Promise<void> {
    this.metrics.observeHistogram('synthetic_check_duration_ms', result.latencyMs, { check: name, status: result.passed ? 'ok' : 'error' });
    if (!result.passed) {
      await this.alert(name, result.error);
    }
    try {
      await this.prisma.healthCheck.create({
        data: { service: `synthetic_${name}`, status: result.passed ? 'ok' : 'down', latencyMs: result.latencyMs },
      });
    } catch {}
  }

  private async alert(checkName: string, error?: string, severity: AlertSeverity = 'medium'): Promise<void> {
    const message = `[SYNTHETIC CHECK FAILED] ${checkName}: ${error}`;
    this.logger.error(message);
    await this.alerting.sendAlert('slack_webhook', message, severity);
  }
}
