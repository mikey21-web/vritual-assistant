import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const ALLOWED_ENTITIES = ['lead', 'conversion', 'ticket', 'revenue'] as const;
const ALLOWED_CHART_TYPES = ['bar', 'line', 'pie'] as const;
const ALLOWED_METRICS: Record<string, string[]> = {
  lead: ['count', 'avg(score)'],
  conversion: ['count', 'sum(amount)'],
  ticket: ['count'],
  revenue: ['sum(amount)', 'count'],
};
const ALLOWED_GROUP_BY: Record<string, string[]> = {
  lead: ['status', 'source', 'segment', 'assignedAgent', 'createdAt'],
  conversion: ['status', 'source', 'createdAt'],
  ticket: ['status', 'priority', 'assignedAgent', 'createdAt'],
  revenue: ['source', 'createdAt'],
};
const ALLOWED_FILTER_FIELDS: Record<string, string[]> = {
  lead: ['status', 'source', 'segment', 'assignedAgentId', 'createdAt'],
  conversion: ['status', 'source', 'leadId', 'createdAt'],
  ticket: ['status', 'priority', 'assignedAgentId', 'createdAt'],
  revenue: ['source', 'createdAt'],
};

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, userId: string) {
    return this.prisma.savedReport.findMany({
      where: { tenantId, OR: [{ ownerId: userId }, { isShared: true }] },
      orderBy: { createdAt: 'desc' },
      include: { owner: { select: { id: true, name: true, email: true } } },
    });
  }

  async findOne(id: string, tenantId: string) {
    const report = await this.prisma.savedReport.findFirst({ where: { id, tenantId } });
    if (!report) throw new NotFoundException('Report not found');
    return report;
  }

  async create(data: { name: string; entity: string; config: any; isShared?: boolean }, tenantId: string, userId: string) {
    const entity = data.entity.toLowerCase();
    if (!ALLOWED_ENTITIES.includes(entity as any)) throw new BadRequestException(`Invalid entity: ${entity}`);
    return this.prisma.savedReport.create({
      data: { name: data.name, entity, config: data.config, isShared: data.isShared ?? false, tenantId, ownerId: userId },
    });
  }

  async update(id: string, data: { name?: string; config?: any; isShared?: boolean }, tenantId: string, userId: string) {
    const report = await this.prisma.savedReport.findFirst({ where: { id, tenantId } });
    if (!report) throw new NotFoundException('Report not found');
    if (report.ownerId !== userId) throw new ForbiddenException('Only the owner can edit this report');
    return this.prisma.savedReport.update({ where: { id }, data });
  }

  async remove(id: string, tenantId: string, userId: string) {
    const report = await this.prisma.savedReport.findFirst({ where: { id, tenantId } });
    if (!report) throw new NotFoundException('Report not found');
    if (report.ownerId !== userId) throw new ForbiddenException('Only the owner can delete this report');
    return this.prisma.savedReport.delete({ where: { id } });
  }

  async run(config: { entity: string; metric: string; groupBy?: string; filters?: Record<string, string>[]; dateRange?: { from?: string; to?: string } }, tenantId: string) {
    const entity = config.entity?.toLowerCase();
    if (!ALLOWED_ENTITIES.includes(entity as any)) throw new BadRequestException(`Invalid entity: ${entity}`);

    const metric = config.metric?.toLowerCase();
    const allowedMetrics = ALLOWED_METRICS[entity];
    if (!allowedMetrics?.includes(metric)) throw new BadRequestException(`Invalid metric '${metric}' for entity '${entity}'. Allowed: ${allowedMetrics?.join(', ')}`);

    let groupBy = config.groupBy?.toLowerCase();
    const allowedGroupBys = ALLOWED_GROUP_BY[entity];
    if (groupBy && !allowedGroupBys?.includes(groupBy)) throw new BadRequestException(`Invalid groupBy '${groupBy}' for entity '${entity}'. Allowed: ${allowedGroupBys?.join(', ')}`);
    if (!groupBy) groupBy = 'createdAt';

    const where: any = { tenantId };
    if (config.filters) {
      for (const f of config.filters) {
        const field = Object.keys(f)[0];
        const val = Object.values(f)[0];
        if (!ALLOWED_FILTER_FIELDS[entity]?.includes(field)) throw new BadRequestException(`Invalid filter field '${field}' for entity '${entity}'`);
        if (field === 'createdAt') {
          const from = config.dateRange?.from ? new Date(config.dateRange.from) : undefined;
          const to = config.dateRange?.to ? new Date(config.dateRange.to) : undefined;
          if (from) where.createdAt = { ...where.createdAt, gte: from };
          if (to) where.createdAt = { ...where.createdAt, lte: to };
        } else {
          (where as any)[field] = val;
        }
      }
    }

    return this.aggregate(entity, metric, groupBy, where);
  }

  private async aggregate(entity: string, metric: string, groupBy: string, where: any) {
    const labels: string[] = [];
    const series: number[] = [];

    const groupFieldMap: Record<string, string> = {
      status: 'status',
      source: 'source',
      segment: 'segment',
      assignedAgent: 'assignedAgentId',
      createdAt: 'createdAt',
      priority: 'priority',
    };

    const field = groupFieldMap[groupBy] || groupBy;

    if (groupBy === 'createdAt') {
      // Date-bucket by day for last 30 days
      const days = 30;
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        const end = new Date(start.getTime() + 86400000);

        const delegate = (this.prisma as any)[entity];
        const count = await delegate.count({
          where: { ...where, createdAt: { gte: start, lt: end } },
        });
        labels.push(start.toISOString().slice(0, 10));
        series.push(count);
      }
      return { labels, series: [{ name: metric, data: series }] };
    }

    // Group by a discrete field
    const delegate = (this.prisma as any)[entity];
    const rows = await delegate.groupBy({
      by: [field],
      _count: true,
      _sum: metric.includes('sum') ? { amount: true } : undefined,
      _avg: metric.includes('avg') ? { score: true } : undefined,
      where,
      orderBy: { _count: { id: 'desc' } },
    });

    for (const row of rows) {
      labels.push(String(row[field]) || 'Unknown');
      if (metric === 'count') series.push(row._count?.id || 0);
      else if (metric === 'sum(amount)') series.push(row._sum?.amount || 0);
      else if (metric === 'avg(score)') series.push(Math.round((row._avg?.score || 0) * 100) / 100);
    }

    return { labels, series: [{ name: metric, data: series }] };
  }
}
