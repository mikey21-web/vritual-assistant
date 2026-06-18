import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class CampaignsService {
  constructor(private prisma: PrismaService, private auditLogs: AuditLogsService) {}

  findAll(query: any = {}) {
    const { active, page = 1, limit = 20 } = query;
    const where: any = {};
    if (active !== undefined) where.active = active === 'true' || active === true;
    return Promise.all([
      this.prisma.campaign.findMany({ where, skip: (+page - 1) * +limit, take: +limit, orderBy: { createdAt: 'desc' }, include: { _count: { select: { leads: true } } } }),
      this.prisma.campaign.count({ where }),
    ]).then(([data, total]) => ({ data, meta: { total, page: +page, limit: +limit } }));
  }

  async findOne(id: string) {
    const c = await this.prisma.campaign.findUnique({ where: { id }, include: { form: true, qrCode: true, nurtureSequence: true, _count: { select: { leads: true } } } });
    if (!c) throw new NotFoundException('Campaign not found');
    return c;
  }

  async create(data: any, userId?: string) { const c = await this.prisma.campaign.create({ data }); await this.auditLogs.log('campaign_created', 'Campaign', c.id, userId); return c; }
  async update(id: string, data: any, userId?: string) { await this.findOne(id); const c = await this.prisma.campaign.update({ where: { id }, data }); await this.auditLogs.log('campaign_updated', 'Campaign', id, userId); return c; }
  async pause(id: string, userId?: string) { await this.findOne(id); const c = await this.prisma.campaign.update({ where: { id }, data: { active: false } }); await this.auditLogs.log('campaign_paused', 'Campaign', id, userId); return c; }
  async activate(id: string, userId?: string) { await this.findOne(id); const c = await this.prisma.campaign.update({ where: { id }, data: { active: true } }); await this.auditLogs.log('campaign_activated', 'Campaign', id, userId); return c; }

  async duplicate(id: string, userId?: string) {
    const c = await this.prisma.campaign.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('Campaign not found');
    const dup = await this.prisma.campaign.create({
      data: {
        name: `${c.name} (copy)`, sourceType: c.sourceType, offer: c.offer, landingUrl: c.landingUrl,
        conversionGoal: c.conversionGoal, crmDestination: c.crmDestination, bookingDestination: c.bookingDestination,
        startDate: c.startDate, endDate: c.endDate, active: false, creatorId: c.creatorId,
        utmSource: c.utmSource, utmMedium: c.utmMedium, utmCampaign: c.utmCampaign,
        utmTerm: c.utmTerm, utmContent: c.utmContent,
      },
    });
    await this.auditLogs.log('campaign_duplicated', 'Campaign', dup.id, userId, { originalId: id });
    return dup;
  }

  async performance(id: string) {
    const c = await this.findOne(id);
    const leads = await this.prisma.lead.findMany({ where: { campaignId: id } });
    return {
      data: {
        campaign: c, totalLeads: leads.length,
        hot: leads.filter(l => l.segment === 'HOT').length, warm: leads.filter(l => l.segment === 'WARM').length,
        cold: leads.filter(l => l.segment === 'COLD').length, converted: leads.filter(l => l.status === 'CONVERTED').length,
        conversionRate: leads.length ? ((leads.filter(l => l.status === 'CONVERTED').length / leads.length) * 100).toFixed(1) : 0,
      },
    };
  }
}
