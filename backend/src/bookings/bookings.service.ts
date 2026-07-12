import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConversionsService } from '../conversions/conversions.service';
import { CalendlyAdapter, GoogleCalendarAdapter, CalendarAdapter } from '../shared/adapters/calendar.adapter';

@Injectable()
export class BookingsService {
  constructor(
    private prisma: PrismaService,
    private conversions: ConversionsService,
    private calendly: CalendlyAdapter,
    private googleCal: GoogleCalendarAdapter,
  ) {}

  private adapterFor(provider: string): CalendarAdapter | null {
    if (provider === 'google') return this.googleCal;
    if (provider === 'calendly') return this.calendly;
    return null; // 'custom' providers have no programmatic calendar API
  }

  findByLead(leadId: string) {
    return this.prisma.booking.findMany({ where: { leadId }, orderBy: { createdAt: 'desc' } });
  }

  // The booking currently in effect for a lead — the one reschedule/cancel act on.
  private getActive(leadId: string) {
    return this.prisma.booking.findFirst({
      where: { leadId, status: { in: ['SCHEDULED', 'RESCHEDULED'] } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async bookForLead(leadId: string, bookingType: string) {
    const lead = await this.prisma.lead.findUnique({ where: { id: leadId }, include: { contact: true } });
    if (!lead) throw new NotFoundException('Lead not found');

    const setting = await this.prisma.bookingSetting.findFirst({ where: { active: true } });
    if (!setting) throw new BadRequestException('No active booking provider configured');

    const adapter = this.adapterFor(setting.provider);
    const linkResult = adapter ? await adapter.createBookingLink({ config: setting.config }, lead) : { link: undefined, error: undefined };
    if (linkResult.error) throw new BadRequestException(linkResult.error);

    const booking = await this.prisma.booking.create({
      data: {
        leadId,
        bookingSettingId: setting.id,
        provider: setting.provider,
        bookingType,
        status: 'SCHEDULED',
        link: linkResult.link,
      },
    });

    await this.conversions.createForLead(leadId, { destination: 'APPOINTMENT_BOOKING', metadata: { bookingType, bookingId: booking.id } });
    return booking;
  }

  async getAvailability(leadId: string) {
    const setting = await this.prisma.bookingSetting.findFirst({ where: { active: true } });
    if (!setting) return { error: 'No active booking provider configured' };
    const adapter = this.adapterFor(setting.provider);
    if (!adapter) return { note: 'This booking provider is managed manually — share the booking link with the lead.' };
    return adapter.getAvailability(setting.config);
  }

  async reschedule(leadId: string, newTime: string, reason?: string) {
    const active = await this.getActive(leadId);
    if (!active) throw new BadRequestException('No active booking to reschedule for this lead');

    const setting = active.bookingSettingId ? await this.prisma.bookingSetting.findUnique({ where: { id: active.bookingSettingId } }) : null;
    const adapter = setting ? this.adapterFor(setting.provider) : null;
    const lead = await this.prisma.lead.findUnique({ where: { id: leadId }, include: { contact: true } });

    const result = adapter
      ? await adapter.rescheduleEvent(setting!.config, { ...active, lead }, newTime)
      : { ok: false, error: 'This booking provider is managed manually — reschedule it directly with the lead.' };

    if (!result.ok) throw new BadRequestException(result.error || 'Reschedule failed');

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.booking.update({ where: { id: active.id }, data: { status: 'RESCHEDULED', metadata: { ...(active.metadata as object), rescheduleReason: reason } } });
      return tx.booking.create({
        data: {
          leadId,
          bookingSettingId: active.bookingSettingId,
          provider: active.provider,
          bookingType: active.bookingType,
          status: 'SCHEDULED',
          scheduledAt: result.scheduledAt ? new Date(result.scheduledAt) : new Date(newTime),
          externalEventId: active.externalEventId,
          link: result.link || active.link,
          previousBookingId: active.id,
        },
      });
    });

    return updated;
  }

  async cancel(leadId: string, reason?: string) {
    const active = await this.getActive(leadId);
    if (!active) throw new BadRequestException('No active booking to cancel for this lead');

    const setting = active.bookingSettingId ? await this.prisma.bookingSetting.findUnique({ where: { id: active.bookingSettingId } }) : null;
    const adapter = setting ? this.adapterFor(setting.provider) : null;

    // Best-effort: cancel with the provider if we can, but always reflect the
    // cancellation locally so the pipeline stays accurate even if the
    // provider call fails or the provider has no cancel API.
    const result = adapter ? await adapter.cancelEvent(setting!.config, active) : { ok: false, error: 'Provider managed manually' };

    return this.prisma.booking.update({
      where: { id: active.id },
      data: { status: 'CANCELLED', metadata: { ...(active.metadata as object), cancelReason: reason, providerCancelled: result.ok, providerCancelError: result.ok ? undefined : result.error } },
    });
  }
}
