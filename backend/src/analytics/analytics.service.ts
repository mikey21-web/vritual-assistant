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

  async forecast() {
    const [stages, leadsByStatus] = await Promise.all([
      this.prisma.pipelineStage.findMany({ select: { status: true, probability: true } }),
      this.prisma.lead.groupBy({
        by: ['status'],
        where: { status: { notIn: ['CONVERTED', 'LOST', 'SPAM'] }, dealValue: { not: null } },
        _sum: { dealValue: true },
        _count: true,
      }),
    ]);
    const probabilityByStatus = new Map(stages.map(s => [s.status, s.probability]));
    const byStage = leadsByStatus.map(l => {
      const probability = probabilityByStatus.get(l.status) ?? 0;
      const totalValue = l._sum.dealValue ?? 0;
      return {
        status: l.status,
        count: l._count,
        totalValue,
        probability,
        weightedValue: +(totalValue * (probability / 100)).toFixed(2),
      };
    });
    const totalWeightedForecast = +byStage.reduce((sum, s) => sum + s.weightedValue, 0).toFixed(2);
    return { totalWeightedForecast, byStage };
  }

  async sources() {
    const leads = await this.prisma.lead.groupBy({ by: ['source'], _count: true });
    return leads.map(l => ({ source: l.source, count: l._count }));
  }

  async sourceInsight(source: string) {
    const [total, converted, statusGroups, ticketCount, urgentOpenTicketCount, overview, sampleLeads] = await Promise.all([
      this.prisma.lead.count({ where: { source: source as any } }),
      this.prisma.lead.count({ where: { source: source as any, status: 'CONVERTED' } }),
      this.prisma.lead.groupBy({ by: ['status'], where: { source: source as any }, _count: true }),
      this.prisma.ticket.count({ where: { lead: { source: source as any } } }),
      this.prisma.ticket.count({ where: { lead: { source: source as any }, priority: 'URGENT', status: { notIn: ['RESOLVED', 'CLOSED'] } } }),
      this.overview(),
      this.prisma.lead.findMany({ where: { source: source as any }, orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, status: true, contact: { select: { name: true } } } }),
    ]);
    return {
      source, total, converted,
      conversionRate: total ? +((converted / total) * 100).toFixed(1) : 0,
      overallConversionRate: +overview.conversionRate,
      statusBreakdown: statusGroups.map(g => ({ status: g.status, count: g._count })),
      ticketCount, urgentOpenTicketCount,
      sampleLeads: sampleLeads.map(l => ({ id: l.id, status: l.status, name: l.contact?.name })),
    };
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

  async dataHealth() {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 3600 * 1000);

    const [missingEmail, missingPhone, duplicateEmails, duplicatePhones, stuckLeads, unassignedLeads, staleHot, totalContacts, totalLeads, urgentOpenTickets, slaBreachedTickets] = await Promise.all([
      this.prisma.contact.count({ where: { OR: [{ email: null }, { email: '' }] } }),
      this.prisma.contact.count({ where: { OR: [{ phone: null }, { phone: '' }] } }),
      this.prisma.contact.groupBy({ by: ['email'], _count: true, having: { email: { _count: { gt: 1 } } } }),
      this.prisma.contact.groupBy({ by: ['phone'], _count: true, having: { phone: { _count: { gt: 1 } } } }),
      this.prisma.lead.count({ where: { status: 'NEW', createdAt: { lt: sevenDaysAgo } } }),
      this.prisma.lead.count({ where: { assignedAgentId: null, status: { notIn: ['CONVERTED', 'LOST'] } } }),
      this.prisma.lead.count({ where: { segment: 'HOT', updatedAt: { lt: threeDaysAgo } } }),
      this.prisma.contact.count(),
      this.prisma.lead.count({ where: { status: { notIn: ['CONVERTED', 'LOST'] } } }),
      this.prisma.ticket.count({ where: { priority: 'URGENT', status: { notIn: ['RESOLVED', 'CLOSED'] } } }),
      this.prisma.ticket.count({ where: { dueAt: { lt: new Date() }, status: { notIn: ['RESOLVED', 'CLOSED'] } } }),
    ]);

    const insights: { type: 'warning' | 'error' | 'info'; message: string; count: number; action: string; page: 'leads' | 'contacts' | 'tickets'; filters?: Record<string, string> }[] = [];

    if (missingEmail > 0) insights.push({ type: 'warning', message: `${missingEmail} contacts have no email address`, count: missingEmail, action: 'Add emails', page: 'contacts' });
    if (missingPhone > 0) insights.push({ type: 'warning', message: `${missingPhone} contacts have no phone number`, count: missingPhone, action: 'Add phones', page: 'contacts' });
    if (duplicateEmails.length > 0) insights.push({ type: 'error', message: `${duplicateEmails.length} duplicate emails found`, count: duplicateEmails.length, action: 'Merge duplicates', page: 'contacts' });
    if (duplicatePhones.length > 0) insights.push({ type: 'error', message: `${duplicatePhones.length} duplicate phone numbers found`, count: duplicatePhones.length, action: 'Merge duplicates', page: 'contacts' });
    if (stuckLeads > 0) insights.push({ type: 'error', message: `${stuckLeads} leads stuck in New for 7+ days`, count: stuckLeads, action: 'Follow up', page: 'leads', filters: { status: 'NEW' } });
    if (unassignedLeads > 0) insights.push({ type: 'warning', message: `${unassignedLeads} active leads have no owner`, count: unassignedLeads, action: 'Assign owners', page: 'leads' });
    if (staleHot > 0) insights.push({ type: 'error', message: `${staleHot} hot leads not contacted in 3+ days`, count: staleHot, action: 'Reach out now', page: 'leads', filters: { segment: 'HOT' } });
    if (urgentOpenTickets > 0) insights.push({ type: 'error', message: `${urgentOpenTickets} urgent tickets still need attention`, count: urgentOpenTickets, action: 'Review tickets', page: 'tickets' });
    if (slaBreachedTickets > 0) insights.push({ type: 'error', message: `${slaBreachedTickets} tickets have breached SLA`, count: slaBreachedTickets, action: 'Review tickets', page: 'tickets' });

    return {
      totalContacts,
      totalLeads,
      dataQuality: {
        complete: totalContacts > 0 ? Math.round(((totalContacts - missingEmail - missingPhone) / totalContacts) * 100) : 100,
        duplicates: duplicateEmails.length + duplicatePhones.length,
      },
      insights,
    };
  }
}
