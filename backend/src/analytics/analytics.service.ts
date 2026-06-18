import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async overview(tenantId?: string | null) {
    const where = tenantId ? { tenantId } : {};
    const [total, hot, warm, cold, converted, lost] = await Promise.all([
      this.prisma.lead.count({ where }),
      this.prisma.lead.count({ where: { ...where, segment: 'HOT' } }),
      this.prisma.lead.count({ where: { ...where, segment: 'WARM' } }),
      this.prisma.lead.count({ where: { ...where, segment: 'COLD' } }),
      this.prisma.lead.count({ where: { ...where, status: 'CONVERTED' } }),
      this.prisma.lead.count({ where: { ...where, status: 'LOST' } }),
    ]);
    return { total, hot, warm, cold, converted, lost, conversionRate: total ? ((converted / total) * 100).toFixed(1) : 0 };
  }

  async sources(tenantId?: string | null) {
    const where = tenantId ? { tenantId } : {};
    const leads = await this.prisma.lead.groupBy({ by: ['source'], _count: true, where });
    return leads.map(l => ({ source: l.source, count: l._count }));
  }

  async campaigns(tenantId?: string | null) {
    const where = tenantId ? { tenantId } : {};
    const campaigns = await this.prisma.campaign.findMany({ where, include: { _count: { select: { leads: true } } } });
    return campaigns.map(c => ({ id: c.id, name: c.name, active: c.active, leadCount: c._count.leads }));
  }

  async conversions(tenantId?: string | null) {
    const where = tenantId ? { tenantId } : {};
    const conversions = await this.prisma.conversion.groupBy({ by: ['destination', 'status'], _count: true, where });
    return conversions;
  }

  async agents(tenantId?: string | null) {
    const agents = await this.prisma.user.findMany({ where: { ...(tenantId ? { tenantId } : {}), role: { in: ['SALES_AGENT', 'MANAGER', 'OWNER'] } }, include: { assignedLeads: true } });
    return agents.map(a => ({
      id: a.id, name: a.name, role: a.role,
      assignedLeads: a.assignedLeads.length,
      converted: a.assignedLeads.filter(l => l.status === 'CONVERTED').length,
    }));
  }
}
