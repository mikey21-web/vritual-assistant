import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CampaignDispatcherService } from './campaign-dispatcher.service';
import { CampaignFilterDto } from './dto/campaign.dto';

@Injectable()
export class CampaignsService {
  constructor(
    private prisma: PrismaService,
    private auditLogs: AuditLogsService,
    private dispatcher: CampaignDispatcherService,
  ) {}

  private async addTimelineEntry(
    campaignId: string,
    event: string,
    detail?: string,
    userId?: string,
    metadata?: any,
  ) {
    return this.prisma.campaignTimelineEntry.create({
      data: { campaignId, event, detail, userId, metadata: metadata || {} },
    });
  }

  async findAll(query: CampaignFilterDto) {
    const {
      status, campaignType, sourceType, search, active,
      page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc',
    } = query;

    const where: any = {};
    if (status) where.status = status;
    if (campaignType) where.campaignType = campaignType;
    if (sourceType) where.sourceType = sourceType;
    if (active !== undefined) where.active = active;

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const sortFieldMap: Record<string, string> = {
      createdAt: 'createdAt',
      name: 'name',
      totalLeads: 'totalLeads',
      totalBudget: 'totalBudget',
      totalSpend: 'totalSpend',
      roi: 'roi',
      priority: 'priority',
      campaignType: 'campaignType',
      status: 'status',
      costPerLead: 'costPerLead',
    };
    const orderField = sortFieldMap[sortBy] || 'createdAt';

    const [data, total] = await Promise.all([
      this.prisma.campaign.findMany({
        where,
        skip: (+page - 1) * +limit,
        take: +limit,
        orderBy: { [orderField]: sortOrder },
        include: {
          _count: { select: { leads: true } },
          timeline: { take: 3, orderBy: { createdAt: 'desc' } },
        },
      }),
      this.prisma.campaign.count({ where }),
    ]);

    return { data, meta: { total, page: +page, limit: +limit } };
  }

  async findOne(id: string) {
    const c = await this.prisma.campaign.findUnique({
      where: { id },
      include: {
        form: true,
        qrCode: true,
        nurtureSequence: true,
        _count: { select: { leads: true } },
      },
    });
    if (!c) throw new NotFoundException('Campaign not found');
    return c;
  }

  async create(data: any, userId?: string) {
    const c = await this.prisma.campaign.create({
      data: {
        ...data,
        status: data.status || 'draft',
        active: data.active !== undefined ? data.active : false,
      },
    });
    await this.addTimelineEntry(c.id, 'campaign_created', 'Campaign created', userId);
    await this.auditLogs.log('campaign_created', 'Campaign', c.id, userId);
    return c;
  }

  async update(id: string, data: any, userId?: string) {
    const existing = await this.findOne(id);
    const timelineEntries: Promise<any>[] = [];

    // Track status changes
    if (data.status && data.status !== existing.status) {
      timelineEntries.push(
        this.addTimelineEntry(
          id,
          `status_changed_to_${data.status}`,
          `Status changed from "${existing.status}" to "${data.status}"`,
          userId,
          { from: existing.status, to: data.status },
        ),
      );
    }

    // Track budget changes
    if (data.budget && JSON.stringify(data.budget) !== JSON.stringify(existing.budget)) {
      timelineEntries.push(
        this.addTimelineEntry(
          id,
          'budget_changed',
          'Budget updated',
          userId,
          { from: existing.budget, to: data.budget },
        ),
      );
    }

    const c = await this.prisma.campaign.update({ where: { id }, data });
    await Promise.all(timelineEntries);
    await this.auditLogs.log('campaign_updated', 'Campaign', id, userId);
    return c;
  }

  async pause(id: string, userId?: string) {
    await this.findOne(id);
    const c = await this.prisma.campaign.update({
      where: { id },
      data: { active: false, status: 'paused' },
    });
    await this.addTimelineEntry(id, 'campaign_paused', 'Campaign paused', userId);
    await this.auditLogs.log('campaign_paused', 'Campaign', id, userId);
    return c;
  }

  async activate(id: string, userId?: string) {
    await this.findOne(id);
    const c = await this.prisma.campaign.update({
      where: { id },
      data: { active: true, status: 'active' },
    });
    await this.addTimelineEntry(id, 'campaign_activated', 'Campaign activated', userId);
    await this.auditLogs.log('campaign_activated', 'Campaign', id, userId);

    // Dispatch campaign messages to target leads
    this.dispatcher.dispatchCampaign(id, userId).then(result => {
      this.addTimelineEntry(id, 'campaign_dispatched',
        `Dispatched to ${result.sent} leads (${result.skipped} skipped, ${result.errors} errors)`,
        userId, result);
    }).catch(err => {
      this.addTimelineEntry(id, 'campaign_dispatch_failed', `Dispatch error: ${err.message}`, userId);
    });

    return c;
  }

  async startCampaign(id: string, userId?: string) {
    const existing = await this.findOne(id);
    if (existing.status === 'active') return existing;
    const c = await this.prisma.campaign.update({
      where: { id },
      data: { status: 'active', active: true, startDate: new Date() },
    });
    await this.addTimelineEntry(id, 'campaign_started', 'Campaign started', userId);
    await this.auditLogs.log('campaign_started', 'Campaign', id, userId);

    // Dispatch campaign messages to target leads
    this.dispatcher.dispatchCampaign(id, userId).then(result => {
      this.addTimelineEntry(id, 'campaign_dispatched',
        `Dispatched to ${result.sent} leads (${result.skipped} skipped, ${result.errors} errors)`,
        userId, result);
    }).catch(err => {
      this.addTimelineEntry(id, 'campaign_dispatch_failed', `Dispatch error: ${err.message}`, userId);
    });

    return c;
  }

  async completeCampaign(id: string, userId?: string) {
    await this.findOne(id);
    const c = await this.prisma.campaign.update({
      where: { id },
      data: { status: 'completed', active: false },
    });
    await this.addTimelineEntry(id, 'campaign_completed', 'Campaign completed', userId);
    await this.auditLogs.log('campaign_completed', 'Campaign', id, userId);
    return c;
  }

  async archiveCampaign(id: string, userId?: string) {
    await this.findOne(id);
    const c = await this.prisma.campaign.update({
      where: { id },
      data: { status: 'archived', active: false },
    });
    await this.addTimelineEntry(id, 'campaign_archived', 'Campaign archived', userId);
    await this.auditLogs.log('campaign_archived', 'Campaign', id, userId);
    return c;
  }

  async duplicate(id: string, userId?: string) {
    const c = await this.prisma.campaign.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('Campaign not found');

    const dup = await this.prisma.campaign.create({
      data: {
        name: `${c.name} (copy)`,
        sourceType: c.sourceType,
        campaignType: c.campaignType,
        description: c.description,
        status: 'draft',
        priority: c.priority,
        budget: c.budget as any,
        targeting: c.targeting as any,
        channels: c.channels as any,
        creatives: c.creatives as any,
        tags: c.tags,
        totalBudget: c.totalBudget,
        dailyBudget: c.dailyBudget,
        offer: c.offer,
        landingUrl: c.landingUrl,
        conversionGoal: c.conversionGoal,
        crmDestination: c.crmDestination,
        bookingDestination: c.bookingDestination,
        startDate: c.startDate,
        endDate: c.endDate,
        active: false,
        creatorId: c.creatorId,
        utmSource: c.utmSource,
        utmMedium: c.utmMedium,
        utmCampaign: c.utmCampaign,
        utmTerm: c.utmTerm,
        utmContent: c.utmContent,
        formId: c.formId,
        qrCodeId: c.qrCodeId,
        tenantId: 'default-tenant',
        nurtureId: c.nurtureId,
        assignedAgentId: c.assignedAgentId,
      },
    });

    await this.addTimelineEntry(dup.id, 'campaign_duplicated', `Duplicated from "${c.name}"`, userId, { originalId: id });
    await this.auditLogs.log('campaign_duplicated', 'Campaign', dup.id, userId, { originalId: id });
    return dup;
  }

  async getTimeline(id: string) {
    await this.findOne(id);
    return this.prisma.campaignTimelineEntry.findMany({
      where: { campaignId: id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async dispatchCampaign(id: string, userId?: string) {
    return this.dispatcher.dispatchCampaign(id, userId);
  }

  async getDispatchStatus(id: string) {
    await this.findOne(id);
    const [total, delivered, failed, blocked] = await Promise.all([
      this.prisma.conversationMessage.count({ where: { campaignId: id } }),
      this.prisma.conversationMessage.count({ where: { campaignId: id, deliveryStatus: 'delivered' } }),
      this.prisma.conversationMessage.count({ where: { campaignId: id, deliveryStatus: 'failed' } }),
      this.prisma.conversationMessage.count({ where: { campaignId: id, deliveryStatus: 'blocked' } }),
    ]);
    return { total, delivered, failed, blocked, pending: total - delivered - failed - blocked };
  }

  async performance(id: string) {
    const c = await this.findOne(id);
    const [allLeads, timeline] = await Promise.all([
      this.prisma.lead.findMany({ where: { campaignId: id } }),
      this.prisma.campaignTimelineEntry.findMany({
        where: { campaignId: id },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);

    const totalLeads = allLeads.length;

    // Segment breakdown
    const bySegment: Record<string, number> = {
      hot: 0, warm: 0, cold: 0, unqualified: 0, existingCustomer: 0, reconnect: 0,
    };
    // Source breakdown
    const bySource: Record<string, number> = {};
    // Status breakdown
    const byStatus: Record<string, number> = {};

    for (const lead of allLeads) {
      // By segment
      const seg = ((lead.segment as string) || '').toLowerCase();
      if (bySegment[seg] !== undefined) bySegment[seg]++;
      else bySegment[seg] = 1;

      // By source
      const src = ((lead.source as string) || 'unknown').toLowerCase();
      bySource[src] = (bySource[src] || 0) + 1;

      // By status
      const st = ((lead.status as string) || 'unknown').toLowerCase();
      byStatus[st] = (byStatus[st] || 0) + 1;
    }

    // Converted leads
    const converted = allLeads.filter(l => l.status === 'CONVERTED').length;
    const conversionRate = totalLeads ? +((converted / totalLeads) * 100).toFixed(1) : 0;

    // Budget stats
    const totalBudget = c.totalBudget || 0;
    const totalSpend = c.totalSpend || 0;
    const remaining = Math.max(0, totalBudget - totalSpend);
    const costPerLead = totalLeads ? +(totalSpend / totalLeads).toFixed(2) : 0;

    // ROI estimation: requires deal/revenue data from CRM integration
    // Without average deal value or totalRevenue, ROI remains null
    // When CRM data is available, integrate: ((revenue - spend) / spend) * 100
    const roi: number | null = null;

    // Channel performance
    let channelPerformance: any[] = [];
    try {
      const channels = typeof c.channels === 'string' ? JSON.parse(c.channels) : c.channels;
      if (Array.isArray(channels)) {
        channelPerformance = channels.map((ch: any) => ({
          type: ch.type || 'unknown',
          active: ch.active !== false,
          leads: allLeads.filter(l => (l as any).sourceType === ch.type).length,
        }));
      }
    } catch { /* ignore parse errors */ }

    // Daily lead counts (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyLeadsMap: Record<string, number> = {};
    for (const lead of allLeads) {
      if (lead.createdAt >= thirtyDaysAgo) {
        const dateKey = lead.createdAt.toISOString().split('T')[0];
        dailyLeadsMap[dateKey] = (dailyLeadsMap[dateKey] || 0) + 1;
      }
    }

    const sortedDailyLeads = Object.entries(dailyLeadsMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));

    return {
      data: {
        campaign: c,
        totalLeads,
        bySegment,
        bySource,
        byStatus,
        converted,
        conversionRate,
        budgetStats: { total: totalBudget, spent: totalSpend, remaining, costPerLead, roi },
        channelPerformance,
        timeline,
        dailyLeads: sortedDailyLeads,
      },
    };
  }
}
