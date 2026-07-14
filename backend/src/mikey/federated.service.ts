import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

export interface AggregateMetric {
  metric: string;
  value: number;
  count: number;
  noise: number;
}

export interface NicheBenchmark {
  niche: string;
  metric: string;
  avgValue: number;
  sampleSize: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
}

@Injectable()
export class FederatedService {
  private readonly logger = new Logger(FederatedService.name);
  private readonly MIN_COHORT_SIZE = 5;
  private readonly EPSILON = 0.5;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  async computeLocalAggregates(tenantId: string): Promise<AggregateMetric[]> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    const [totalLeads, convertedLeads, leads30d, converted30d, bookings, conversations, campaigns] = await Promise.all([
      this.prisma.lead.count({ where: { tenantId, createdAt: { gte: ninetyDaysAgo } } }),
      this.prisma.lead.count({ where: { tenantId, status: 'CONVERTED', createdAt: { gte: ninetyDaysAgo } } }),
      this.prisma.lead.count({ where: { tenantId, createdAt: { gte: thirtyDaysAgo } } }),
      this.prisma.lead.count({ where: { tenantId, status: 'CONVERTED', createdAt: { gte: thirtyDaysAgo } } }),
      this.prisma.booking.count({ where: { tenantId, createdAt: { gte: thirtyDaysAgo } } }),
      this.prisma.conversationMessage.count({ where: { lead: { tenantId }, createdAt: { gte: thirtyDaysAgo } } }),
      this.prisma.campaign.count({ where: { tenantId, createdAt: { gte: ninetyDaysAgo } } }),
    ]);

    const aggregates: AggregateMetric[] = [
      { metric: 'conversion_rate_90d', value: totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0, count: totalLeads, noise: 0 },
      { metric: 'conversion_rate_30d', value: leads30d > 0 ? (converted30d / leads30d) * 100 : 0, count: leads30d, noise: 0 },
      { metric: 'booking_volume_30d', value: bookings, count: leads30d, noise: 0 },
      { metric: 'message_volume_30d', value: conversations, count: leads30d, noise: 0 },
      { metric: 'campaign_count_90d', value: campaigns, count: totalLeads, noise: 0 },
      { metric: 'avg_deal_value', value: 0, count: 0, noise: 0 },
    ];

    if (totalLeads > 0) {
      const bySource = await this.prisma.lead.groupBy({
        by: ['source'],
        where: { tenantId, createdAt: { gte: ninetyDaysAgo } },
        _count: { id: true },
      });
      const bySourceConverted = await this.prisma.lead.groupBy({
        by: ['source'],
        where: { tenantId, status: 'CONVERTED', createdAt: { gte: ninetyDaysAgo } },
        _count: { id: true },
      });
      const convMap = new Map(bySourceConverted.map(s => [s.source, s._count.id]));
      for (const s of bySource) {
        const converted = convMap.get(s.source) || 0;
        aggregates.push({
          metric: `conversion_by_source_${s.source}`,
          value: s._count.id > 0 ? (converted / s._count.id) * 100 : 0,
          count: s._count.id,
          noise: 0,
        });
      }

      const bySegment = await this.prisma.lead.groupBy({
        by: ['segment'],
        where: { tenantId, createdAt: { gte: ninetyDaysAgo } },
        _count: { id: true },
      });
      for (const s of bySegment) {
        aggregates.push({
          metric: `leads_by_segment_${s.segment?.toLowerCase() || 'unknown'}`,
          value: s._count.id,
          count: s._count.id,
          noise: 0,
        });
      }

      const revenueRecords = await this.prisma.revenueRecord.findMany({
        where: { lead: { tenantId }, createdAt: { gte: ninetyDaysAgo } },
        select: { amount: true },
      });
      if (revenueRecords.length > 0) {
        const avgValue = revenueRecords.reduce((s, r) => s + r.amount, 0) / revenueRecords.length;
        aggregates.find(a => a.metric === 'avg_deal_value')!.value = avgValue;
        aggregates.find(a => a.metric === 'avg_deal_value')!.count = revenueRecords.length;
      }
    }

    const dpAggregates = aggregates.map(a => this.addLaplaceNoise(a));
    return dpAggregates;
  }

  private addLaplaceNoise(aggregate: AggregateMetric): AggregateMetric {
    if (aggregate.count < 5) {
      return { ...aggregate, value: 0, noise: -1 };
    }
    const sensitivity = aggregate.metric.includes('rate') ? 100 / aggregate.count : 1;
    const scale = sensitivity / this.EPSILON;
    const noise = this.sampleLaplace(0, scale);
    return {
      ...aggregate,
      value: Math.max(0, aggregate.value + noise),
      noise,
    };
  }

  private sampleLaplace(mu: number, scale: number): number {
    const u = Math.random() - 0.5;
    return mu - scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
  }

  async getLocalForPush(tenantId: string) {
    const aggregates = await this.computeLocalAggregates(tenantId);
    const niche = await this.getNicheForTenant(tenantId);

    const validAggregates = aggregates.filter(a => a.noise !== -1);
    if (validAggregates.length === 0) return null;

    return {
      tenantId,
      niche,
      aggregates: validAggregates,
      computedAt: new Date().toISOString(),
    };
  }

  async pullBenchmarksFromAggregator(niche: string): Promise<NicheBenchmark[]> {
    const aggregatorUrl = this.config.get<string>('FEDERATED_AGGREGATOR_URL');
    if (!aggregatorUrl) return [];

    try {
      const https = await import('https');
      const http = await import('http');
      const transporter = aggregatorUrl.startsWith('https') ? https : http;
      const url = new URL(aggregatorUrl);

      return new Promise((resolve) => {
        const req = transporter.get(
          `${url.protocol}//${url.hostname}${url.port ? ':' + url.port : ''}/mikey/aggregator/benchmarks?niche=${encodeURIComponent(niche)}`,
          (res) => {
            let data = '';
            res.on('data', (chunk: string) => data += chunk);
            res.on('end', () => {
              try {
                const parsed = JSON.parse(data);
                resolve(parsed.benchmarks || []);
              } catch {
                resolve([]);
              }
            });
          },
        );
        req.on('error', () => resolve([]));
        req.end();
      });
    } catch {
      return [];
    }
  }

  async getLocalBenchmarks(tenantId: string): Promise<NicheBenchmark[]> {
    const niche = await this.getNicheForTenant(tenantId);

    const aggregatorBenchmarks = await this.pullBenchmarksFromAggregator(niche);
    if (aggregatorBenchmarks.length > 0) {
      this.logger.log(`Federated: pulled ${aggregatorBenchmarks.length} benchmarks from aggregator for niche "${niche}"`);
      return aggregatorBenchmarks;
    }

    this.logger.warn(`Federated: no aggregator benchmarks available for niche "${niche}". Push your local data first.`);
    return [];
  }

  private async getNicheForTenant(tenantId: string): Promise<string> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { settings: true },
    });
    return (tenant?.settings as any)?.niche || 'general';
  }

  async getPrivacyReport(tenantId: string) {
    const localData = await this.computeLocalAggregates(tenantId);
    const dpApplied = localData.filter(a => a.noise !== -1).length;
    const suppressed = localData.filter(a => a.noise === -1).length;
    const optIn = await this.getOptIn(tenantId);
    return {
      tenantId,
      totalMetrics: localData.length,
      dpApplied,
      suppressed,
      epsilon: this.EPSILON,
      minCohortSize: this.MIN_COHORT_SIZE,
      rawDataNeverLeaves: true,
      onlyAggregatesTransmitted: true,
      optedIn: optIn,
    };
  }

  async setOptIn(tenantId: string, optedIn: boolean) {
    return this.prisma.federatedOptIn.upsert({
      where: { tenantId },
      create: { tenantId, optedIn },
      update: { optedIn },
    });
  }

  async getOptIn(tenantId: string): Promise<boolean> {
    const record = await this.prisma.federatedOptIn.findUnique({ where: { tenantId } });
    return record?.optedIn ?? false;
  }

  async shouldShareWithAggregator(tenantId: string): Promise<boolean> {
    const optedIn = await this.getOptIn(tenantId);
    if (!optedIn) {
      this.logger.debug(`Federated: tenant ${tenantId} has not opted in — skipping push`);
      return false;
    }
    return true;
  }

  async pushToAggregator(tenantId: string): Promise<boolean> {
    if (!(await this.shouldShareWithAggregator(tenantId))) return false;
    const aggregatorUrl = this.config.get<string>('FEDERATED_AGGREGATOR_URL');
    if (!aggregatorUrl) {
      this.logger.warn('Federated: no aggregator URL configured — push skipped.');
      return false;
    }
    const localData = await this.getLocalForPush(tenantId);
    if (!localData) return false;
    // ... rest of push logic stays the same
    return this._doPush(aggregatorUrl, localData);
  }

  private async _doPush(aggregatorUrl: string, localData: any): Promise<boolean> {
    try {
      const https = await import('https');
      const http = await import('http');
      const transporter = aggregatorUrl.startsWith('https') ? https : http;
      const url = new URL(aggregatorUrl);

      const body = JSON.stringify({
        niche: localData.niche,
        tenantId: localData.tenantId,
        aggregates: localData.aggregates,
        computedAt: localData.computedAt,
      });

      return new Promise((resolve) => {
        const req = transporter.request(
          {
            hostname: url.hostname,
            port: url.port,
            path: '/mikey/aggregator/push',
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
          },
          (res) => {
            let data = '';
            res.on('data', (chunk: string) => data += chunk);
            res.on('end', () => resolve(res.statusCode === 200));
          },
        );
        req.on('error', (err: Error) => {
          this.logger.error(`Federated: push request failed: ${err.message}`);
          resolve(false);
        });
        req.write(body);
        req.end();
      });
    } catch (err: any) {
      this.logger.error(`Federated push failed: ${err.message}`);
      return false;
    }
  }
}
