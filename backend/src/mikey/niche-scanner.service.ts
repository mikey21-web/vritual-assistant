import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface NicheFinding {
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

  constructor(private prisma: PrismaService) {}

  async scanAll(): Promise<NicheFinding[]> {
    const settings = await this.prisma.businessSettings.findFirst({}) as any;
    const industry = settings?.industry || '';

    const scanners: Record<string, () => Promise<NicheFinding[]>> = {
      events: () => this.scanEvents(),
      healthcare: () => this.scanHealthcare(),
      hospitality: () => this.scanHospitality(),
      logistics: () => this.scanLogistics(),
      real_estate: () => this.scanRealEstate(),
      marketing_agency: () => this.scanAgency(),
    };

    const scanner = scanners[industry];
    if (!scanner) return [];
    return scanner();
  }

  private async scanEvents(): Promise<NicheFinding[]> {
    const findings: NicheFinding[] = [];
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const upcoming = await this.prisma.lead.findMany({
      where: {
        status: { notIn: ['CONVERTED', 'LOST', 'SPAM'] },
        createdAt: { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) },
      },
      include: { contact: true },
      take: 15,
    });

    if (upcoming.length >= 3) {
      const names = upcoming.slice(0, 3).map(l => l.contact?.name || 'Unknown');
      findings.push({
        type: 'events_active_leads',
        severity: 'info',
        title: `${upcoming.length} active leads in the pipeline`,
        description: `${names.join(', ')}${upcoming.length > 3 ? ` and ${upcoming.length - 3} more` : ''}. Review and move them through the pipeline.`,
        count: upcoming.length,
        metadata: { leadIds: upcoming.map(l => l.id) },
      });
    }

    const staleAppointments = await this.prisma.lead.findMany({
      where: {
        status: 'APPOINTMENT_BOOKED',
        updatedAt: { lt: new Date(now.getTime() - 48 * 60 * 60 * 1000) },
      },
      include: { contact: true },
      take: 10,
    });
    if (staleAppointments.length > 0) {
      findings.push({
        type: 'events_stale_bookings',
        severity: 'warning',
        title: `${staleAppointments.length} booking(s) stuck`,
        description: `${staleAppointments.slice(0, 3).map(l => l.contact?.name || 'Unknown').join(', ')}${staleAppointments.length > 3 ? ` and ${staleAppointments.length - 3} more` : ''} have booked but no update in 48h. Follow up.`,
        count: staleAppointments.length,
        metadata: { leadIds: staleAppointments.map(l => l.id) },
      });
    }

    return findings;
  }

  private async scanHealthcare(): Promise<NicheFinding[]> {
    const findings: NicheFinding[] = [];
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const tomorrowAppts = await this.prisma.lead.findMany({
      where: {
        status: 'APPOINTMENT_BOOKED',
        updatedAt: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
      },
      include: { contact: true },
      take: 10,
    });

    if (tomorrowAppts.length > 0) {
      findings.push({
        type: 'healthcare_reminders',
        severity: 'info',
        title: `${tomorrowAppts.length} appointment(s) to manage`,
        description: `${tomorrowAppts.slice(0, 3).map(l => l.contact?.name || 'Unknown').join(', ')}${tomorrowAppts.length > 3 ? ` and ${tomorrowAppts.length - 3} more` : ''} have upcoming appointments. 24h reminders recommended.`,
        count: tomorrowAppts.length,
        metadata: { leadIds: tomorrowAppts.map(l => l.id) },
      });
    }

    const noShows = await this.prisma.lead.count({
      where: { status: 'LOST', updatedAt: { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) } },
    });
    if (noShows >= 5) {
      findings.push({
        type: 'healthcare_noshow_rate',
        severity: noShows > 15 ? 'critical' : 'warning',
        title: `No-show rate: ${noShows} lost in 30 days`,
        description: `${noShows} patients marked LOST in last 30 days. Dual reminders (24h + 1h) can reduce this.`,
        count: noShows,
        metadata: {},
      });
    }

    return findings;
  }

  private async scanHospitality(): Promise<NicheFinding[]> {
    const findings: NicheFinding[] = [];
    const now = new Date();

    const upcomingStays = await this.prisma.lead.findMany({
      where: {
        status: 'APPOINTMENT_BOOKED',
        updatedAt: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
      },
      include: { contact: true },
      take: 15,
    });

    if (upcomingStays.length > 0) {
      findings.push({
        type: 'hospitality_upcoming_stays',
        severity: 'info',
        title: `${upcomingStays.length} upcoming booking(s)`,
        description: `${upcomingStays.slice(0, 3).map(l => l.contact?.name || 'Unknown').join(', ')}${upcomingStays.length > 3 ? ` and ${upcomingStays.length - 3} more` : ''}. Prep rooms and confirm details.`,
        count: upcomingStays.length,
        metadata: { leadIds: upcomingStays.map(l => l.id) },
      });
    }

    const recentCheckins = await this.prisma.lead.findMany({
      where: { status: 'ENGAGED', updatedAt: { gte: new Date(now.getTime() - 48 * 60 * 60 * 1000) } },
      take: 5,
    });
    if (recentCheckins.length > 0) {
      findings.push({
        type: 'hospitality_checked_in',
        severity: 'info',
        title: `${recentCheckins.length} guest(s) currently checked in`,
        description: `${recentCheckins.length} guest(s) are checked in. Ensure front desk is briefed on any preferences.`,
        count: recentCheckins.length,
        metadata: { leadIds: recentCheckins.map(l => l.id) },
      });
    }

    return findings;
  }

  private async scanLogistics(): Promise<NicheFinding[]> {
    const findings: NicheFinding[] = [];
    const now = new Date();

    const inTransit = await this.prisma.lead.findMany({
      where: {
        status: 'ENGAGED',
        updatedAt: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
      },
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
          title: `${staleInTransit.length} shipment(s) stale in transit`,
          description: `${staleInTransit.slice(0, 3).map(l => l.contact?.name || 'Unknown').join(', ')}${staleInTransit.length > 3 ? ` and ${staleInTransit.length - 3} more` : ''} haven't updated in 48h. Notify customers.`,
          count: staleInTransit.length,
          metadata: { leadIds: staleInTransit.map(l => l.id) },
        });
      }
    }

    const pendingQuotes = await this.prisma.lead.count({
      where: {
        status: 'CONTACTED',
        updatedAt: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
      },
    });
    if (pendingQuotes >= 3) {
      findings.push({
        type: 'logistics_pending_quotes',
        severity: pendingQuotes > 8 ? 'critical' : 'warning',
        title: `${pendingQuotes} quote(s) awaiting response`,
        description: `${pendingQuotes} shippers received quotes this week but haven't booked. Follow up.`,
        count: pendingQuotes,
        metadata: {},
      });
    }

    return findings;
  }

  private async scanRealEstate(): Promise<NicheFinding[]> {
    const findings: NicheFinding[] = [];
    const now = new Date();

    const freshBuyers = await this.prisma.lead.findMany({
      where: {
        status: 'NEW',
        createdAt: { gte: new Date(now.getTime() - 48 * 60 * 60 * 1000) },
      },
      include: { contact: true },
      take: 10,
    });

    if (freshBuyers.length > 0) {
      findings.push({
        type: 'realestate_fresh_buyers',
        severity: 'info',
        title: `${freshBuyers.length} new buyer(s) in 48h`,
        description: `${freshBuyers.slice(0, 3).map(l => l.contact?.name || 'Unknown').join(', ')}${freshBuyers.length > 3 ? ` and ${freshBuyers.length - 3} more` : ''}. Assign agents and contact ASAP.`,
        count: freshBuyers.length,
        metadata: { leadIds: freshBuyers.map(l => l.id) },
      });
    }

    const noFollowUp = await this.prisma.lead.findMany({
      where: {
        status: 'QUALIFIED',
        updatedAt: { lt: new Date(now.getTime() - 72 * 60 * 60 * 1000) },
      },
      include: { contact: true },
      take: 10,
    });
    if (noFollowUp.length > 0) {
      findings.push({
        type: 'realestate_no_site_visit',
        severity: 'warning',
        title: `Qualified buyers — no site visit yet`,
        description: `${noFollowUp.slice(0, 2).map(l => l.contact?.name || 'Unknown').join(', ')}${noFollowUp.length > 2 ? ` and ${noFollowUp.length - 2} more` : ''} haven't been offered a site visit in 72h.`,
        count: noFollowUp.length,
        metadata: { leadIds: noFollowUp.map(l => l.id) },
      });
    }

    return findings;
  }

  private async scanAgency(): Promise<NicheFinding[]> {
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
        description: `${stalledNegotiations.slice(0, 3).map(l => l.contact?.name || 'Unknown').join(', ')}${stalledNegotiations.length > 3 ? ` and ${stalledNegotiations.length - 3} more` : ''} haven't moved in 72h.`,
        count: stalledNegotiations.length,
        metadata: { leadIds: stalledNegotiations.map(l => l.id) },
      });
    }

    const staleProposals = await this.prisma.lead.count({
      where: {
        status: 'PROPOSAL_SENT',
        updatedAt: { lt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000) },
      },
    });
    if (staleProposals > 0) {
      findings.push({
        type: 'agency_stale_proposals',
        severity: 'warning',
        title: `${staleProposals} proposal(s) sent, no response in 5 days`,
        description: `${staleProposals} prospect(s) haven't responded to proposals. A follow-up could help close them.`,
        count: staleProposals,
        metadata: {},
      });
    }

    return findings;
  }
}
