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

  async pushToAggregator(tenantId: string): Promise<boolean> {
    const localData = await this.getLocalForPush(tenantId);
    if (!localData) {
      this.logger.warn(`Federated: insufficient data for tenant ${tenantId}`);
      return false;
    }

    try {
      const aggregatorUrl = this.config.get<string>('FEDERATED_AGGREGATOR_URL');
      if (!aggregatorUrl) {
        this.logger.warn('Federated: no aggregator URL configured — storing locally');

        await this.prisma.systemEvent.create({
          data: {
            type: 'mikey.federated_aggregate',
            source: 'federated-service',
            entityType: 'tenant',
            entityId: tenantId,
            payload: localData as any,
          },
        });
        return true;
      }

      const https = await import('https');
      const http = await import('http');
      const transporter = aggregatorUrl.startsWith('https') ? https : http;

      return new Promise((resolve) => {
        const data = JSON.stringify(localData);
        const url = new URL(aggregatorUrl);
        const req = transporter.request(
          {
            hostname: url.hostname,
            port: url.port,
            path: '/api/v1/federated/push',
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
          },
          (res) => {
            resolve(res.statusCode === 200);
          },
        );
        req.on('error', () => resolve(false));
        req.write(data);
        req.end();
      });
    } catch (err: any) {
      this.logger.error(`Federated push failed: ${err.message}`);
      return false;
    }
  }

  async getLocalBenchmarks(tenantId: string): Promise<NicheBenchmark[]> {
    const niche = await this.getNicheForTenant(tenantId);
    const myAggs = await this.computeLocalAggregates(tenantId);
    const myMap = new Map(myAggs.map(a => [a.metric, a]));

    const events = await this.prisma.systemEvent.findMany({
      where: {
        type: 'mikey.federated_aggregate',
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
      take: 1000,
    });

    const peerAggs: Map<string, number[]> = new Map();
    for (const e of events) {
      const payload = e.payload as any;
      if (!payload?.niche || payload.niche !== niche) continue;
      if (!payload?.aggregates) continue;
      for (const a of payload.aggregates) {
        if (!peerAggs.has(a.metric)) peerAggs.set(a.metric, []);
        peerAggs.get(a.metric)!.push(a.value);
      }
    }

    const benchmarks: NicheBenchmark[] = [];
    for (const [metric, values] of peerAggs) {
      if (values.length < this.MIN_COHORT_SIZE) continue;
      const sorted = [...values].sort((a, b) => a - b);
      benchmarks.push({
        niche,
        metric,
        avgValue: sorted.reduce((s, v) => s + v, 0) / sorted.length,
        sampleSize: sorted.length,
        p25: sorted[Math.floor(sorted.length * 0.25)],
        p50: sorted[Math.floor(sorted.length * 0.5)],
        p75: sorted[Math.floor(sorted.length * 0.75)],
        p90: sorted[Math.floor(sorted.length * 0.9)],
      });
    }

    return benchmarks;
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
    return {
      tenantId,
      totalMetrics: localData.length,
      dpApplied,
      suppressed,
      epsilon: this.EPSILON,
      minCohortSize: this.MIN_COHORT_SIZE,
      rawDataNeverLeaves: true,
      onlyAggregatesTransmitted: true,
    };
  }
}
