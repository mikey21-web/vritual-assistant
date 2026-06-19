import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async overview() {
    const [total, hot, warm, cold, converted, lost] = await Promise.all([
      this.prisma.lead.count(),
      this.prisma.lead.count({ where: { segment: 'HOT' } }),
      this.prisma.lead.count({ where: { segment: 'WARM' } }),
      this.prisma.lead.count({ where: { segment: 'COLD' } }),
      this.prisma.lead.count({ where: { status: 'CONVERTED' } }),
      this.prisma.lead.count({ where: { status: 'LOST' } }),
    ]);
    return { total, hot, warm, cold, converted, lost, conversionRate: total ? ((converted / total) * 100).toFixed(1) : 0 };
  }

  async sources() {
    const leads = await this.prisma.lead.groupBy({ by: ['source'], _count: true });
    return leads.map(l => ({ source: l.source, count: l._count }));
  }

  async campaigns() {
    const campaigns = await this.prisma.campaign.findMany({ include: { _count: { select: { leads: true } } } });
    return campaigns.map(c => ({ id: c.id, name: c.name, active: c.active, leadCount: c._count.leads }));
  }

  async conversions() {
    return this.prisma.conversion.groupBy({ by: ['destination', 'status'], _count: true });
  }

  async agents() {
    const agents = await this.prisma.user.findMany({ where: { role: { in: ['SALES_AGENT', 'MANAGER', 'OWNER'] } }, include: { assignedLeads: true } });
    return agents.map(a => ({
      id: a.id, name: a.name, role: a.role,
      assignedLeads: a.assignedLeads.length,
      converted: a.assignedLeads.filter(l => l.status === 'CONVERTED').length,
    }));
  }
}
