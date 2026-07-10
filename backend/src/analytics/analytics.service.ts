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

  async dataHealth() {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 3600 * 1000);

    const [missingEmail, missingPhone, duplicateEmails, duplicatePhones, stuckLeads, unassignedLeads, staleHot, totalContacts, totalLeads] = await Promise.all([
      this.prisma.contact.count({ where: { OR: [{ email: null }, { email: '' }] } }),
      this.prisma.contact.count({ where: { OR: [{ phone: null }, { phone: '' }] } }),
      this.prisma.contact.groupBy({ by: ['email'], _count: true, having: { email: { _count: { gt: 1 } } } }),
      this.prisma.contact.groupBy({ by: ['phone'], _count: true, having: { phone: { _count: { gt: 1 } } } }),
      this.prisma.lead.count({ where: { status: 'NEW', createdAt: { lt: sevenDaysAgo } } }),
      this.prisma.lead.count({ where: { assignedAgentId: null, status: { notIn: ['CONVERTED', 'LOST'] } } }),
      this.prisma.lead.count({ where: { segment: 'HOT', updatedAt: { lt: threeDaysAgo } } }),
      this.prisma.contact.count(),
      this.prisma.lead.count({ where: { status: { notIn: ['CONVERTED', 'LOST'] } } }),
    ]);

    const insights: { type: 'warning' | 'error' | 'info'; message: string; count: number; action: string }[] = [];

    if (missingEmail > 0) insights.push({ type: 'warning', message: `${missingEmail} contacts have no email address`, count: missingEmail, action: 'Add emails' });
    if (missingPhone > 0) insights.push({ type: 'warning', message: `${missingPhone} contacts have no phone number`, count: missingPhone, action: 'Add phones' });
    if (duplicateEmails.length > 0) insights.push({ type: 'error', message: `${duplicateEmails.length} duplicate emails found`, count: duplicateEmails.length, action: 'Merge duplicates' });
    if (duplicatePhones.length > 0) insights.push({ type: 'error', message: `${duplicatePhones.length} duplicate phone numbers found`, count: duplicatePhones.length, action: 'Merge duplicates' });
    if (stuckLeads > 0) insights.push({ type: 'error', message: `${stuckLeads} leads stuck in New for 7+ days`, count: stuckLeads, action: 'Follow up' });
    if (unassignedLeads > 0) insights.push({ type: 'warning', message: `${unassignedLeads} active leads have no owner`, count: unassignedLeads, action: 'Assign owners' });
    if (staleHot > 0) insights.push({ type: 'error', message: `${staleHot} hot leads not contacted in 3+ days`, count: staleHot, action: 'Reach out now' });

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
