import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ApprovalsService } from '../approvals/approvals.service';
import { EventsService } from '../events/events.service';

const HOUR_MS = 1000 * 60 * 60;
const TWO_HOURS_MS = 2 * HOUR_MS;

@Injectable()
export class DailyBriefService {
  private readonly logger = new Logger(DailyBriefService.name);

  constructor(
    private prisma: PrismaService,
    private approvals: ApprovalsService,
    private events: EventsService,
  ) {}

  async getDailyBrief(tenantId: string) {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const sevenDaysAgo = new Date(todayStart);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const fourteenDaysAgo = new Date(todayStart);
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const [summary, sources, revenueAtRisk, readyForBooking, channelConflicts, pendingApprovals, todayVisits] =
      await Promise.all([
        this.getSummary(tenantId, todayStart, yesterdayStart, now),
        this.getSources(sevenDaysAgo, yesterdayStart, fourteenDaysAgo),
        this.getRevenueAtRisk(tenantId),
        this.getReadyForBooking(tenantId),
        this.getChannelConflicts(tenantId),
        this.getPendingApprovals(tenantId),
        this.getTodayVisits(tenantId, todayStart),
      ]);

    return {
      date: todayStart.toISOString().split('T')[0],
      summary,
      sources,
      revenueAtRisk,
      readyForBooking,
      channelConflicts,
      pendingApprovals,
      todayVisits,
    };
  }

  // ── Summary ────────────────────────────────────────────

  private async getSummary(tenantId: string, todayStart: Date, yesterdayStart: Date, now: Date) {
    const [totalLeads, hotLeads, newLeadsToday, newLeadsYesterday, slowAgents] = await Promise.all([
      this.prisma.lead.count({ where: { tenantId } }),
      this.prisma.lead.count({ where: { tenantId, segment: 'HOT' } }),
      this.prisma.lead.count({ where: { tenantId, createdAt: { gte: todayStart } } }),
      this.prisma.lead.count({ where: { tenantId, createdAt: { gte: yesterdayStart, lt: todayStart } } }),
      this.getSlowAgents(tenantId, now),
    ]);

    return { newLeadsYesterday, newLeadsToday, hotLeads, totalLeads, slowAgents };
  }

  private async getSlowAgents(tenantId: string, now: Date) {
    const twoHoursAgo = new Date(now.getTime() - TWO_HOURS_MS);

    const agents = await this.prisma.user.findMany({
      where: { tenantId, role: 'SALES_AGENT', active: true },
      include: {
        assignedLeads: {
          where: { segment: 'HOT', updatedAt: { lt: twoHoursAgo } },
          select: { id: true, updatedAt: true },
        },
      },
    });

    return agents
      .filter(a => a.assignedLeads.length > 0)
      .map(a => {
        const stalest = a.assignedLeads.reduce((min, l) =>
          l.updatedAt < min.updatedAt ? l : min,
        );
        const hours = (now.getTime() - stalest.updatedAt.getTime()) / HOUR_MS;
        return {
          id: a.id,
          name: a.name,
          hotLeadCount: a.assignedLeads.length,
          responseTimeHours: Math.round(hours * 10) / 10,
        };
      });
  }

  // ── Sources ────────────────────────────────────────────

  private async getSources(
    sevenDaysAgo: Date,
    yesterdayStart: Date,
    fourteenDaysAgo: Date,
  ) {
    const periodEnd = new Date(yesterdayStart);
    periodEnd.setHours(23, 59, 59, 999);
    const yesterdayEnd = new Date(yesterdayStart);
    yesterdayEnd.setHours(23, 59, 59, 999);

    const [currentPeriod, previousPeriod, yesterdayCounts] = await Promise.all([
      this.prisma.lead.groupBy({
        by: ['source'],
        where: { createdAt: { gte: sevenDaysAgo, lte: periodEnd } },
        _count: true,
      }),
      this.prisma.lead.groupBy({
        by: ['source'],
        where: { createdAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo } },
        _count: true,
      }),
      this.prisma.lead.groupBy({
        by: ['source'],
        where: { createdAt: { gte: yesterdayStart, lte: yesterdayEnd } },
        _count: true,
      }),
    ]);

    const prevMap = new Map(previousPeriod.map(p => [p.source, p._count]));
    const yesterdayMap = new Map(yesterdayCounts.map(p => [p.source, p._count]));

    return currentPeriod.map(p => {
      const prev = prevMap.get(p.source) || 0;
      const yesterday = yesterdayMap.get(p.source) || 0;
      const changePercent =
        prev === 0
          ? p._count > 0 ? 100 : 0
          : Math.round(((p._count - prev) / prev) * 1000) / 10;

      let alert: 'drop' | 'surge' | 'normal' = 'normal';
      if (changePercent < -20) alert = 'drop';
      else if (changePercent > 20) alert = 'surge';

      return {
        name: this.formatSourceName(p.source),
        leads7d: p._count,
        leadsYesterday: yesterday,
        leadsPrevious7d: prev,
        changePercent,
        alert,
      };
    });
  }

  private formatSourceName(source: string): string {
    const map: Record<string, string> = {
      MAGICBRICKS: 'MagicBricks',
      INDIAMART: 'IndiaMART',
      NINETY_NINE_ACRES: '99Acres',
      HOUSING_COM: 'Housing.com',
      JUSTDIAL: 'JustDial',
      WHATSAPP: 'WhatsApp',
      TELEGRAM: 'Telegram',
      GOOGLE_ADS: 'Google Ads',
      META_ADS: 'Meta Ads',
      SOCIAL_MEDIA: 'Social Media',
      PHONE_CALL: 'Phone Call',
      QR_CODE: 'QR Code',
      CAMPAIGN: 'Campaign',
      FORM: 'Form',
      CHATBOT: 'Chatbot',
      MOBILE_APP: 'Mobile App',
      EMAIL: 'Email',
      TRADEINDIA: 'TradeIndia',
      MANUAL: 'Manual',
      REFERRAL: 'Referral',
      AI: 'AI',
    };
    return map[source] || source;
  }

  // ── Revenue at Risk ────────────────────────────────────

  private async getRevenueAtRisk(tenantId: string) {
    const [bookings, overdueSchedules, pendingOldBookings] = await Promise.all([
      this.prisma.booking.findMany({
        where: { tenantId, status: { notIn: ['CONFIRMED', 'CANCELLED'] } },
        select: { bookingAmountPaise: true },
      }),
      this.prisma.paymentSchedule.findMany({
        where: { tenantId, dueDate: { lt: new Date() }, status: { not: 'PAID' } },
        select: { amount: true },
      }),
      this.prisma.booking.count({
        where: {
          tenantId,
          status: 'PENDING',
          createdAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

    const totalPaise = bookings.reduce((s, b) => s + Number(b.bookingAmountPaise || 0n), 0);
    const overdueCollectionsPaise = Math.round(
      overdueSchedules.reduce((s, p) => s + (p.amount || 0) * 100, 0),
    );

    return {
      totalPaise,
      overdueCollectionsPaise,
      bookingsAtRisk: pendingOldBookings,
      currency: 'INR',
    };
  }

  // ── Ready for Booking ──────────────────────────────────

  private async getReadyForBooking(tenantId: string) {
    const leads = await this.prisma.lead.findMany({
      where: {
        tenantId,
        segment: { in: ['HOT', 'WARM'] },
        status: { in: ['QUALIFIED', 'ENGAGED'] },
        costSheets: { none: {} },
      },
      orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }],
      include: {
        contact: { select: { name: true, phone: true } },
        conversations: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { createdAt: true },
        },
      },
    });

    const now = Date.now();
    return leads.map(l => {
      const lastMsg = l.conversations[0];
      const daysSinceLastContact = lastMsg
        ? Math.floor((now - lastMsg.createdAt.getTime()) / (1000 * 60 * 60 * 24))
        : 999;
      return {
        leadId: l.id,
        leadName: l.contact?.name || 'Unknown',
        phone: l.contact?.phone || '',
        interest: l.interest || '',
        daysSinceLastContact,
        missingCostSheet: true,
      };
    });
  }

  // ── Channel Conflicts ──────────────────────────────────

  private async getChannelConflicts(tenantId: string) {
    const leads = await this.prisma.lead.findMany({
      where: {
        tenantId,
        channelPartnerId: { not: null },
        partnerLeadClaims: { some: {} },
      },
      include: {
        contact: { select: { name: true } },
        channelPartner: { select: { name: true } },
        partnerLeadClaims: {
          include: { channelPartner: { select: { name: true } } },
          where: { status: { not: 'REJECTED' } },
        },
      },
    });

    return leads
      .filter(l => {
        const partners = new Set(l.partnerLeadClaims.map(c => c.channelPartnerId));
        if (l.channelPartnerId) partners.add(l.channelPartnerId);
        return partners.size > 1;
      })
      .map(l => {
        const names = new Set<string>();
        if (l.channelPartner) names.add(l.channelPartner.name);
        l.partnerLeadClaims.forEach(c => names.add(c.channelPartner.name));
        return {
          leadId: l.id,
          leadName: l.contact?.name || 'Unknown',
          partners: Array.from(names),
          projects: [],
        };
      });
  }

  // ── Pending Approvals ──────────────────────────────────

  private async getPendingApprovals(tenantId: string) {
    const items = await this.prisma.approvalRequest.findMany({
      where: { tenantId, status: 'PENDING', type: { startsWith: 'mikey_' } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, type: true, reason: true, createdAt: true },
    });

    return {
      count: items.length,
      items: items.map(a => ({
        id: a.id,
        type: a.type,
        title: a.type.replace('mikey_', '').replace(/_/g, ' '),
        description: a.reason || '',
        createdAt: a.createdAt.toISOString(),
      })),
    };
  }

  // ── Today's Visits ─────────────────────────────────────

  private async getTodayVisits(tenantId: string, todayStart: Date) {
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);

    const visits = await this.prisma.siteVisit.findMany({
      where: {
        tenantId,
        startAt: { gte: todayStart, lt: tomorrowStart },
        status: { in: ['SCHEDULED', 'CONFIRMED'] },
      },
      include: {
        lead: {
          include: {
            contact: { select: { name: true, phone: true } },
            conversations: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: { text: true },
            },
          },
        },
        project: { select: { name: true } },
      },
      orderBy: { startAt: 'asc' },
    });

    return visits.map(v => ({
      id: v.id,
      leadId: v.leadId,
      leadName: v.lead.contact?.name || 'Unknown',
      phone: v.lead.contact?.phone || '',
      startAt: v.startAt.toISOString(),
      projectName: v.project?.name,
      interest: v.lead.interest || '',
      lastMessage: v.lead.conversations[0]?.text || '',
      budget: v.lead.budget || '',
    }));
  }
}
