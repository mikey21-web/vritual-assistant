import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsService } from '../events/events.service';

export interface TemporalInsight {
  type: 'day_of_week' | 'hour_of_day' | 'source_time';
  source: string;
  dayOfWeek?: number;
  hourOfDay?: number;
  conversionRate: number;
  leadCount: number;
  baselineRate: number;
  lift: number;
  recommendation: string;
}

@Injectable()
export class TemporalStrategyService {
  private readonly logger = new Logger(TemporalStrategyService.name);
  private cachedInsights: TemporalInsight[] = [];
  private lastScan = 0;

  constructor(
    private prisma: PrismaService,
    private events: EventsService,
  ) {}

  async scan(): Promise<TemporalInsight[]> {
    const now = Date.now();
    if (now - this.lastScan < 30 * 60 * 1000 && this.cachedInsights.length > 0) {
      return this.cachedInsights;
    }

    const insights: TemporalInsight[] = [];
    const thirtyDays = new Date(now - 30 * 24 * 60 * 60 * 1000);

    const leads = await this.prisma.lead.findMany({
      where: { createdAt: { gte: thirtyDays } },
      select: { source: true, status: true, createdAt: true, id: true },
    });

    if (leads.length < 20) return [];

    const baseline = leads.filter(l => l.status === 'CONVERTED').length / leads.length;

    const byDay: Record<number, { total: number; converted: number }> = {};
    const byHour: Record<number, { total: number; converted: number }> = {};
    const bySourceDay: Record<string, Record<number, { total: number; converted: number }>> = {};

    for (const lead of leads) {
      const day = lead.createdAt.getDay();
      const hour = lead.createdAt.getHours();
      const source = lead.source || 'UNKNOWN';

      if (!byDay[day]) byDay[day] = { total: 0, converted: 0 };
      byDay[day].total++;
      if (lead.status === 'CONVERTED') byDay[day].converted++;

      if (!byHour[hour]) byHour[hour] = { total: 0, converted: 0 };
      byHour[hour].total++;
      if (lead.status === 'CONVERTED') byHour[hour].converted++;

      if (!bySourceDay[source]) bySourceDay[source] = {};
      if (!bySourceDay[source][day]) bySourceDay[source][day] = { total: 0, converted: 0 };
      bySourceDay[source][day].total++;
      if (lead.status === 'CONVERTED') bySourceDay[source][day].converted++;
    }

    for (const [dayStr, data] of Object.entries(byDay)) {
      const day = Number(dayStr);
      if (data.total < 5) continue;
      const rate = data.converted / data.total;
      const lift = baseline > 0 ? ((rate - baseline) / baseline) * 100 : 0;
      if (Math.abs(lift) < 20) continue;

      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      insights.push({
        type: 'day_of_week',
        source: 'all',
        dayOfWeek: day,
        conversionRate: rate,
        leadCount: data.total,
        baselineRate: baseline,
        lift,
        recommendation: lift > 0
          ? `${dayNames[day]} leads convert ${lift.toFixed(0)}% above baseline (${(rate * 100).toFixed(1)}% vs ${(baseline * 100).toFixed(1)}%). Prioritize ${dayNames[day]} leads for quick wins.`
          : `${dayNames[day]} leads convert ${Math.abs(lift).toFixed(0)}% below baseline. Consider adjusting ${dayNames[day]} campaigns or routing.`,
      });
    }

    for (const [source, days] of Object.entries(bySourceDay)) {
      for (const [dayStr, data] of Object.entries(days)) {
        const day = Number(dayStr);
        if (data.total < 3) continue;
        const rate = data.converted / data.total;
        const lift = baseline > 0 ? ((rate - baseline) / baseline) * 100 : 0;
        if (Math.abs(lift) < 30) continue;

        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        insights.push({
          type: 'source_time',
          source,
          dayOfWeek: day,
          conversionRate: rate,
          leadCount: data.total,
          baselineRate: baseline,
          lift,
          recommendation: lift > 0
            ? `${source} leads on ${dayNames[day]} convert ${lift.toFixed(0)}% above baseline. Route ${source} leads from ${dayNames[day]} to your best closer.`
            : `${source} leads on ${dayNames[day]} convert ${Math.abs(lift).toFixed(0)}% below baseline. Consider pausing ${source} ads on ${dayNames[day]}.`,
        });
      }
    }

    insights.sort((a, b) => Math.abs(b.lift) - Math.abs(a.lift));
    const topInsights = insights.slice(0, 5);

    this.cachedInsights = topInsights;
    this.lastScan = now;

    for (const insight of topInsights) {
      await this.events.emit({
        type: 'mikey.temporal_insight',
        source: 'temporal-strategy',
        payload: insight as any,
      });
      this.logger.log(`Temporal insight: ${insight.recommendation}`);
    }

    return topInsights;
  }

  async getInsights(): Promise<TemporalInsight[]> {
    if (this.cachedInsights.length === 0) {
      return this.scan();
    }
    return this.cachedInsights;
  }
}

