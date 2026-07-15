import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsService } from '../events/events.service';

interface NicheFinding {
  type: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  count: number;
  metadata: any;
}

@Injectable()
export class NicheScannerService {
  private readonly logger = new Logger(NicheScannerService.name);

  constructor(
    private prisma: PrismaService,
    private events: EventsService,
  ) {}

  async scanAll(): Promise<NicheFinding[]> {
    const settings = await this.prisma.businessSettings.findFirst({}) as any;
    const industry = settings?.industry || '';
    const labels = settings?.labels || {};
    const leadLabel = labels.lead || 'lead';

    const scanners: Record<string, () => Promise<NicheFinding[]>> = {
      events: () => this.scanEvents(settings, leadLabel),
      healthcare: () => this.scanHealthcare(settings, leadLabel),
      hospitality: () => this.scanHospitality(settings, leadLabel),
      logistics: () => this.scanLogistics(settings, leadLabel),
      real_estate: () => this.scanRealEstate(settings, leadLabel),
      marketing_agency: () => this.scanAgency(settings, leadLabel),
    };

    const scanner = scanners[industry];
    if (!scanner) return [];
    return scanner();
  }

  private async scanEvents(settings: any, label: string): Promise<NicheFinding[]> {
    const findings: NicheFinding[] = [];
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const upcoming = await this.prisma.lead.findMany({
      where: {
        status: { notIn: ['CONVERTED', 'LOST', 'SPAM'] },
        customFields: { path: '$.event_date', not: null },
        customFields: { path: '$.event_date', lte: weekFromNow.toISOString() },
      },
      take: 10,
    });

    if (upcoming.length > 0) {
      const missingServices = upcoming.filter(l => {
        const cf = (l as any).customFields || {};
        return !cf.services_needed || cf.services_needed.length === 0;
      });
      if (missingServices.length > 0) {
        findings.push({
          type: 'events_missing_services',
          severity: 'warning',
          title: `Events missing service selections`,
          description: `${missingServices.length} upcoming event(s) haven't specified services (catering, decor, etc). Review before the event date approaches.`,
          count: missingServices.length,
          metadata: { leadIds: missingServices.map(l => l.id) },
        });
      }

      if (upcoming.length >= 3) {
        const names = upcoming.slice(0, 3).map(l => (l as any).contact?.name || 'Unknown');
        findings.push({
          type: 'events_upcoming_week',
          severity: 'info',
          title: `${upcoming.length} events in the next 7 days`,
          description: `${names.join(', ')}${upcoming.length > 3 ? ` and ${upcoming.length - 3} more` : ''} have events coming up. Prep checklists and confirm details.`,
          count: upcoming.length,
          metadata: { leadIds: upcoming.map(l => l.id) },
        });
      }
    }

    return findings;
  }

  private async scanHealthcare(settings: any, label: string): Promise<NicheFinding[]> {
    const findings: NicheFinding[] = [];
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const tomorrowAppts = await this.prisma.lead.findMany({
      where: {
        status: 'APPOINTMENT_BOOKED',
        customFields: { path: '$.preferred_date', lte: tomorrow.toISOString(), gte: now.toISOString() },
      },
      include: { contact: true },
      take: 10,
    });

    if (tomorrowAppts.length > 0) {
      findings.push({
        type: 'healthcare_reminders_needed',
        severity: 'info',
        title: `${tomorrowAppts.length} appointment(s) tomorrow — send reminders`,
        description: `${tomorrowAppts.slice(0, 3).map(l => l.contact?.name || 'Unknown').join(', ')}${tomorrowAppts.length > 3 ? ` and ${tomorrowAppts.length - 3} more` : ''} have appointments tomorrow. Automated 24h reminder recommended.`,
        count: tomorrowAppts.length,
        metadata: { leadIds: tomorrowAppts.map(l => l.id) },
      });
    }

    const noShows = await this.prisma.lead.count({
      where: {
        status: 'LOST',
        updatedAt: { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) },
      },
    });
    if (noShows >= 5) {
      findings.push({
        type: 'healthcare_noshow_rate',
        severity: noShows > 15 ? 'critical' : 'warning',
        title: `No-show rate: ${noShows} lost in 30 days`,
        description: `${noShows} patients marked LOST in last 30 days. Consider dual reminders (24h + 1h before) to reduce no-shows.`,
        count: noShows,
        metadata: {},
      });
    }

    return findings;
  }

  private async scanHospitality(settings: any, label: string): Promise<NicheFinding[]> {
    const findings: NicheFinding[] = [];
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const upcomingStays = await this.prisma.lead.findMany({
      where: {
        status: 'APPOINTMENT_BOOKED',
        customFields: { path: '$.check_in_date', lte: weekFromNow.toISOString() },
      },
      include: { contact: true },
      take: 15,
    });

    if (upcomingStays.length > 0) {
      const withSpecialRequests = upcomingStays.filter(l => {
        const cf = (l as any).customFields || {};
        return cf.special_requests && cf.special_requests.trim().length > 0;
      });
      if (withSpecialRequests.length > 0) {
        findings.push({
          type: 'hospitality_special_requests',
          severity: 'info',
          title: `${withSpecialRequests.length} guest(s) with special requests`,
          description: `${withSpecialRequests.slice(0, 3).map(l => l.contact?.name || 'Unknown').join(', ')}${withSpecialRequests.length > 3 ? ` and ${withSpecialRequests.length - 3} more` : ''} have special requests. Brief your front desk.`,
          count: withSpecialRequests.length,
          metadata: { leadIds: withSpecialRequests.map(l => l.id) },
        });
      }
    }

    const recentStays = await this.prisma.lead.findMany({
      where: { status: 'ENGAGED', updatedAt: { gte: new Date(now.getTime() - 48 * 60 * 60 * 1000) } },
      take: 5,
    });
    if (recentStays.length > 0) {
      const checkedInToday = recentStays.filter(l => {
        const cf = (l as any).customFields || {};
        const ci = cf.check_in_date || '';
        return ci.startsWith(now.toISOString().slice(0, 10));
      });
      if (checkedInToday.length > 0) {
        findings.push({
          type: 'hospitality_checkins_today',
          severity: 'info',
          title: `${checkedInToday.length} check-in(s) today`,
          description: `${checkedInToday.length} guest(s) checking in today. Ensure rooms are prepped.`,
          count: checkedInToday.length,
          metadata: { leadIds: checkedInToday.map(l => l.id) },
        });
      }
    }

    return findings;
  }

  private async scanLogistics(settings: any, label: string): Promise<NicheFinding[]> {
    const findings: NicheFinding[] = [];
    const now = new Date();

    const inTransit = await this.prisma.lead.findMany({
      where: { status: 'ENGAGED', updatedAt: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) } },
      include: { contact: true },
      take: 10,
    });

    if (inTransit.length > 0) {
      const staleInTransit = inTransit.filter(l => {
        const updated = new Date(l.updatedAt).getTime();
        return now.getTime() - updated > 48 * 60 * 60 * 1000;
      });
      if (staleInTransit.length > 0) {
        findings.push({
          type: 'logistics_stale_transit',
          severity: 'warning',
          title: `${staleInTransit.length} shipment(s) in transit with no update in 48h`,
          description: `${staleInTransit.slice(0, 3).map(l => l.contact?.name || 'Unknown').join(', ')}${staleInTransit.length > 3 ? ` and ${staleInTransit.length - 3} more` : ''}. Check status or notify customers of ETA.`,
          count: staleInTransit.length,
          metadata: { leadIds: staleInTransit.map(l => l.id) },
        });
      }
    }

    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const pendingQuotes = await this.prisma.lead.count({
      where: { status: 'CONTACTED', updatedAt: { gte: weekAgo } },
    });
    if (pendingQuotes >= 3) {
      findings.push({
        type: 'logistics_pending_quotes',
        severity: pendingQuotes > 8 ? 'critical' : 'warning',
        title: `${pendingQuotes} quote(s) pending response`,
        description: `${pendingQuotes} shippers requested quotes this week but haven't booked yet. Consider a follow-up message.`,
        count: pendingQuotes,
        metadata: {},
      });
    }

    return findings;
  }

  private async scanRealEstate(settings: any, label: string): Promise<NicheFinding[]> {
    const findings: NicheFinding[] = [];
    const now = new Date();

    const freshBuyers = await this.prisma.lead.findMany({
      where: { status: 'NEW', createdAt: { gte: new Date(now.getTime() - 48 * 60 * 60 * 1000) } },
      include: { contact: true },
      take: 10,
    });

    if (freshBuyers.length > 0) {
      const urgentBuyers = freshBuyers.filter(l => {
        const cf = (l as any).customFields || {};
        return cf.move_in_timeline === 'Immediate';
      });
      if (urgentBuyers.length > 0) {
        findings.push({
          type: 'realestate_urgent_buyers',
          severity: 'critical',
          title: `${urgentBuyers.length} immediate buyer(s) — prioritize`,
          description: `${urgentBuyers.slice(0, 3).map(l => l.contact?.name || 'Unknown').join(', ')}${urgentBuyers.length > 3 ? ` and ${urgentBuyers.length - 3} more` : ''} want immediate move-in. Assign and contact within the hour.`,
          count: urgentBuyers.length,
          metadata: { leadIds: urgentBuyers.map(l => l.id) },
        });
      }
    }

    const noFollowUp = await this.prisma.lead.findMany({
      where: { status: 'QUALIFIED', updatedAt: { lt: new Date(now.getTime() - 72 * 60 * 60 * 1000) } },
      include: { contact: true },
      take: 10,
    });
    if (noFollowUp.length > 0) {
      findings.push({
        type: 'realestate_no_site_visit',
        severity: 'warning',
        title: `Qualified buyers — no site visit yet`,
        description: `${noFollowUp.length} qualified buyer(s) not contacted for site visit in 72h. ${noFollowUp.slice(0, 2).map(l => l.contact?.name || 'Unknown').join(', ')}${noFollowUp.length > 2 ? ` and ${noFollowUp.length - 2} more` : ''}. Invite them this weekend.`,
        count: noFollowUp.length,
        metadata: { leadIds: noFollowUp.map(l => l.id) },
      });
    }

    return findings;
  }

  private async scanAgency(settings: any, label: string): Promise<NicheFinding[]> {
    const findings: NicheFinding[] = [];
    const now = new Date();

    const stalledNegotiations = await this.prisma.lead.findMany({
      where: {
        status: 'QUALIFYING',
        updatedAt: { lt: new Date(now.getTime() - 72 * 60 * 60 * 1000) },
      },
      include: { contact: true },
      take: 10,
    });
    if (stalledNegotiations.length > 0) {
      findings.push({
        type: 'agency_stalled_deals',
        severity: 'warning',
        title: `${stalledNegotiations.length} deal(s) stuck in negotiation`,
        description: `${stalledNegotiations.slice(0, 3).map(l => l.contact?.name || 'Unknown').join(', ')}${stalledNegotiations.length > 3 ? ` and ${stalledNegotiations.length - 3} more` : ''} haven't moved in 72h. Follow up or send revised proposal.`,
        count: stalledNegotiations.length,
        metadata: { leadIds: stalledNegotiations.map(l => l.id) },
      });
    }

    const proposalsSent = await this.prisma.lead.findMany({
      where: { status: 'PROPOSAL_SENT', updatedAt: { lt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000) } },
      take: 10,
    });
    if (proposalsSent.length > 0) {
      findings.push({
        type: 'agency_stale_proposals',
        severity: 'warning',
        title: `${proposalsSent.length} proposal(s) sent — no response in 5 days`,
        description: `${proposalsSent.length} prospect(s) received proposals over 5 days ago without response. A gentle follow-up could help.`,
        count: proposalsSent.length,
        metadata: { leadIds: proposalsSent.map(l => l.id) },
      });
    }

    return findings;
  }
}
