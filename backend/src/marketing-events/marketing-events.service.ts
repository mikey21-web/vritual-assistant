import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TimelineService } from '../timeline/timeline.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import * as crypto from 'crypto';

@Injectable()
export class MarketingEventsService {
  constructor(
    private prisma: PrismaService,
    private timeline: TimelineService,
    private auditLogs: AuditLogsService,
  ) {}

  async createEvent(tenantId: string, data: {
    name: string; eventType: string; startAt: string; endAt?: string;
    location?: string; description?: string; capacity?: number; projectId?: string;
  }, createdById?: string) {
    const event = await this.prisma.marketingEvent.create({
      data: { tenantId, name: data.name, eventType: data.eventType as any,
        startAt: new Date(data.startAt),
        endAt: data.endAt ? new Date(data.endAt) : null, location: data.location,
        description: data.description, capacity: data.capacity, projectId: data.projectId,
        createdById },
    });
    await this.auditLogs.log('CREATE', 'MarketingEvent', event.id, createdById, { after: event });
    return event;
  }

  async findAll(tenantId: string) {
    return this.prisma.marketingEvent.findMany({
      where: { tenantId }, orderBy: { startAt: 'desc' },
      include: { _count: { select: { invitees: true } } },
    });
  }

  async findOne(tenantId: string, id: string) {
    const event = await this.prisma.marketingEvent.findFirst({
      where: { id, tenantId },
      include: { invitees: { include: { lead: { include: { contact: { select: { name: true, phone: true } } } } } } },
    });
    if (!event) throw new NotFoundException('Event not found');
    return event;
  }

  async inviteLeads(tenantId: string, eventId: string, leadIds: string[]) {
    const event = await this.prisma.marketingEvent.findFirst({ where: { id: eventId, tenantId } });
    if (!event) throw new NotFoundException('Event not found');

    const invitees: any[] = [];
    for (const leadId of leadIds) {
      const lead = await this.prisma.lead.findFirst({
        where: { id: leadId, tenantId },
        include: { contact: { select: { name: true, phone: true } } },
      });
      if (!lead) continue;
      const existing = await this.prisma.marketingEventInvitee.findFirst({ where: { eventId, leadId } });
      if (existing) continue;
      const invitee = await this.prisma.marketingEventInvitee.create({
        data: { eventId, leadId, name: lead.contact?.name || null, phone: lead.contact?.phone || null },
      });
      await this.timeline.add({ type: 'event_invited', title: `Invited to event: ${event.name}`, leadId,
        metadata: { marketingEventId: eventId }, createdById: undefined });
      invitees.push(invitee);
    }
    return invitees;
  }

  async recordRsvp(tenantId: string, inviteeId: string, status: string) {
    const invitee = await this.prisma.marketingEventInvitee.findFirst({
      where: { id: inviteeId, event: { tenantId } },
      include: { event: true },
    });
    if (!invitee) throw new NotFoundException('Invitee not found');
    const updated = await this.prisma.marketingEventInvitee.update({
      where: { id: inviteeId },
      data: { rsvpStatus: status as any },
    });
    if (invitee.leadId) {
      await this.timeline.add({ type: 'event_rsvp', title: `RSVP ${status} for ${invitee.event.name}`, leadId: invitee.leadId,
        metadata: { marketingEventId: invitee.eventId }, createdById: undefined });
    }
    return updated;
  }

  async generateCheckInToken(inviteeId: string) {
    const invitee = await this.prisma.marketingEventInvitee.findUnique({ where: { id: inviteeId } });
    if (!invitee) throw new NotFoundException('Invitee not found');
    const token = crypto.randomBytes(16).toString('hex');
    const updated = await this.prisma.marketingEventInvitee.update({
      where: { id: inviteeId },
      data: { qrCheckInToken: token },
    });
    return updated;
  }

  async checkIn(token: string) {
    const invitee = await this.prisma.marketingEventInvitee.findUnique({ where: { qrCheckInToken: token } });
    if (!invitee) throw new NotFoundException('Invalid check-in token');
    if (invitee.checkedInAt) return invitee;
    const updated = await this.prisma.marketingEventInvitee.update({
      where: { id: invitee.id },
      data: { checkedInAt: new Date(), rsvpStatus: 'ATTENDED' },
    });
    if (invitee.leadId) {
      await this.timeline.add({
        type: 'event_checked_in', title: 'Checked in at event', leadId: invitee.leadId,
        metadata: { marketingEventId: invitee.eventId }, createdById: undefined,
      });
    }
    return updated;
  }

  async getEventReport(eventId: string, tenantId?: string) {
    const where: any = { id: eventId };
    if (tenantId) where.tenantId = tenantId;
    const event = await this.prisma.marketingEvent.findFirst({
      where, include: { invitees: { include: { lead: { select: { status: true } } } } },
    });
    if (!event) throw new NotFoundException('Event not found');

    const total = event.invitees.length;
    const confirmed = event.invitees.filter(i => i.rsvpStatus === 'CONFIRMED').length;
    const attended = event.invitees.filter(i => i.rsvpStatus === 'ATTENDED').length;
    const noShows = event.invitees.filter(i => i.rsvpStatus === 'NO_SHOW').length;
    const converted = event.invitees.filter(i => i.lead?.status === 'CONVERTED').length;

    return { eventId: event.id, name: event.name, invited: total, confirmed, attended, noShows, converted };
  }
}
