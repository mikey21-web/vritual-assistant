import { Controller, Post, Get, Body, Query, Logger, HttpCode } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

const MIN_COHORT_SIZE = 5;
const DATA_RETENTION_DAYS = 90;

@Controller('mikey/aggregator')
export class AggregatorController {
  private readonly logger = new Logger(AggregatorController.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  @Post('push')
  @HttpCode(200)
  async pushAggregates(@Body() body: {
    niche: string;
    tenantId: string;
    aggregates: { metric: string; value: number; noise: number; count: number }[];
    computedAt: string;
  }) {
    const { niche, tenantId, aggregates } = body;

    if (!niche || !tenantId || !aggregates?.length) {
      return { accepted: false, reason: 'Missing required fields' };
    }

    const stored: string[] = [];
    for (const agg of aggregates) {
      if (agg.noise === -1 || agg.count < MIN_COHORT_SIZE) continue;
      const record = await this.prisma.federatedAggregate.create({
        data: {
          niche,
          tenantId,
          metric: agg.metric,
          value: agg.value,
          noise: agg.noise,
          sampleSize: agg.count,
          reportedAt: new Date(),
          expiresAt: new Date(Date.now() + DATA_RETENTION_DAYS * 24 * 60 * 60 * 1000),
        },
      });
      stored.push(record.id);
    }

    // Prune expired data
    await this.prisma.federatedAggregate.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    }).catch(() => {});

    this.logger.log(`Aggregator: stored ${stored.length} metrics from ${tenantId} (niche: ${niche})`);

    return { accepted: true, stored: stored.length };
  }

  @Get('benchmarks')
  async getBenchmarks(
    @Query('niche') niche: string,
    @Query('metric') metric?: string,
  ) {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const where: any = { reportedAt: { gte: sevenDaysAgo } };
    if (niche) where.niche = niche;

    const aggregates = await this.prisma.federatedAggregate.findMany({
      where,
      select: { niche: true, metric: true, value: true, tenantId: true, sampleSize: true },
    });

    const groupKey = (a: typeof aggregates[0]) => `${a.niche}:${a.metric}`;
    const grouped = new Map<string, typeof aggregates>();

    for (const a of aggregates) {
      const key = groupKey(a);
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(a);
    }

    const benchmarks: any[] = [];
    for (const [key, items] of grouped) {
      const uniqueTenants = new Set(items.map(i => i.tenantId)).size;
      if (uniqueTenants < MIN_COHORT_SIZE) continue;

      const values = items.map(i => i.value).sort((a, b) => a - b);
      const [nicheName, metricName] = key.split(':');

      benchmarks.push({
        niche: nicheName,
        metric: metricName,
        avgValue: +(values.reduce((s, v) => s + v, 0) / values.length).toFixed(2),
        p25: +values[Math.floor(values.length * 0.25)].toFixed(2),
        p50: +values[Math.floor(values.length * 0.5)].toFixed(2),
        p75: +values[Math.floor(values.length * 0.75)].toFixed(2),
        p90: +values[Math.floor(values.length * 0.9)].toFixed(2),
        sampleSize: uniqueTenants,
        totalReports: items.length,
      });
    }

    return { benchmarks, cohortThreshold: MIN_COHORT_SIZE };
  }

  @Get('health')
  async health() {
    const totalAggregates = await this.prisma.federatedAggregate.count();
    const uniqueTenants = await this.prisma.federatedAggregate.groupBy({
      by: ['tenantId'],
      _count: { id: true },
    });
    return {
      status: 'ok',
      totalAggregates,
      uniqueTenants: uniqueTenants.length,
      minCohortSize: MIN_COHORT_SIZE,
      retentionDays: DATA_RETENTION_DAYS,
    };
  }
}
