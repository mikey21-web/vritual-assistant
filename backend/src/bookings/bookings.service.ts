import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { BookingStatus } from '@prisma/client';
import { BookingLifecycleService } from './booking-lifecycle.service';

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private lifecycle: BookingLifecycleService,
  ) {}

  async checkAvailability(startTime: Date, endTime?: Date, durationMinutes?: number) {
    const end = endTime || new Date(startTime.getTime() + (durationMinutes || 60) * 60000);

    const conflicting = await this.prisma.booking.findMany({
      where: {
        status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
        AND: [
          { startTime: { lt: end } },
          { endTime: { gt: startTime } },
        ],
      },
      select: { id: true, startTime: true, endTime: true, title: true },
    });

    return {
      available: conflicting.length === 0,
      conflicts: conflicting,
      requestedSlot: { startTime, endTime: end },
    };
  }

  async create(data: {
    tenantId?: string;
    leadId: string;
    title: string;
    description?: string;
    startTime: Date;
    endTime?: Date;
    price?: number;
    currency?: string;
    propertyId?: string;
    unitId?: string;
  }) {
    let tenantId = data.tenantId;
    if (!tenantId) {
      const lead = await this.prisma.lead.findUnique({ where: { id: data.leadId }, select: { tenantId: true } });
      if (!lead) throw new NotFoundException('Lead not found');
      tenantId = lead.tenantId;
    }

    const availability = await this.checkAvailability(data.startTime, data.endTime);
    if (!availability.available) {
      throw new BadRequestException('Time slot is not available');
    }

    const booking = await this.prisma.booking.create({
      data: {
        tenantId,
        leadId: data.leadId,
        title: data.title,
        description: data.description,
        startTime: data.startTime,
        endTime: data.endTime || new Date(data.startTime.getTime() + 60 * 60000),
        price: data.price,
        currency: data.currency || 'INR',
        propertyId: data.propertyId,
        unitId: data.unitId,
      },
    });

    // Booking a builder Unit (as opposed to a broker Property) should move it
    // out of AVAILABLE so the availability grid and inventory velocity stay
    // accurate — the same status-history pattern ProjectsService.updateUnit uses.
    if (data.unitId) {
      try {
        const unit = await this.prisma.unit.findUnique({ where: { id: data.unitId } });
        if (unit && unit.status === 'AVAILABLE') {
          await this.prisma.unit.update({ where: { id: data.unitId }, data: { status: 'BLOCKED' } });
          await this.prisma.unitStatusHistory.create({
            data: { unitId: data.unitId, fromStatus: unit.status, toStatus: 'BLOCKED' },
          });
        }
      } catch (e: any) {
        this.logger.warn(`Failed to update unit status for booking ${booking.id}: ${e.message}`);
      }
    }

    // Queue the 24h + 2h reminders. Best-effort — a scheduling hiccup must never
    // block the booking itself from being created.
    try {
      await this.lifecycle.scheduleSiteVisitReminders(booking);
    } catch (e: any) {
      this.logger.warn(`Failed to schedule reminders for booking ${booking.id}: ${e.message}`);
    }

    return booking;
  }

  async findAll(query: { leadId?: string; status?: string; page?: number; limit?: number }) {
    const { leadId, status, page = 1, limit = 20 } = query;
    const where: any = {};
    if (leadId) where.leadId = leadId;
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        skip: (+page - 1) * +limit,
        take: +limit,
        orderBy: { startTime: 'desc' },
        include: { lead: { select: { id: true, contact: { select: { name: true, email: true, phone: true } } } } },
      }),
      this.prisma.booking.count({ where }),
    ]);

    return { data, meta: { total, page: +page, limit: +limit } };
  }

  async findOne(id: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: { lead: { select: { id: true, contact: { select: { name: true, email: true, phone: true } } } } },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    return booking;
  }

  async update(id: string, data: any) {
    const booking = await this.prisma.booking.findUnique({ where: { id } });
    if (!booking) throw new NotFoundException('Booking not found');

    const updated = await this.prisma.booking.update({ where: { id }, data });

    try {
      const statusChanged = data.status && data.status !== booking.status;
      const startChanged = data.startTime && new Date(data.startTime).getTime() !== booking.startTime.getTime();

      if (statusChanged && updated.status === BookingStatus.COMPLETED) {
        // Visit happened — stop reminders, start the post-visit nurture cadence.
        await this.lifecycle.cancelBookingActions(id, ['sv_reminder']);
        await this.lifecycle.schedulePostVisitFollowups(updated);
      } else if (statusChanged && updated.status === BookingStatus.CANCELLED) {
        await this.lifecycle.cancelBookingActions(id);
      } else if (startChanged && [BookingStatus.PENDING, BookingStatus.CONFIRMED].includes(updated.status as any)) {
        // Rescheduled — drop the old reminders and re-arm against the new time.
        await this.lifecycle.cancelBookingActions(id, ['sv_reminder']);
        await this.lifecycle.scheduleSiteVisitReminders(updated);
      }
    } catch (e: any) {
      this.logger.warn(`Booking ${id} lifecycle update hook failed: ${e.message}`);
    }

    return updated;
  }

  async findByTenant(tenantId: string, query: { status?: string; page?: number; limit?: number }) {
    const { status, page = 1, limit = 20 } = query;
    const where: any = { tenantId };
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        skip: (+page - 1) * +limit,
        take: +limit,
        orderBy: { startTime: 'desc' },
        include: { lead: { select: { id: true, contact: { select: { name: true, email: true, phone: true } } } } },
      }),
      this.prisma.booking.count({ where }),
    ]);

    return { data, meta: { total, page: +page, limit: +limit } };
  }

  async createPaymentLink(bookingId: string, returnUrl?: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Booking not found');

    const stripeKey = this.config.get<string>('STRIPE_SECRET_KEY');
    if (stripeKey) {
      try {
        const stripe = require('stripe')(stripeKey);
        const session = await stripe.checkout.sessions.create({
          mode: 'payment',
          line_items: [{
            price_data: {
              currency: booking.currency.toLowerCase(),
              product_data: { name: booking.title },
              unit_amount: Math.round((booking.price || 0) * 100),
            },
            quantity: 1,
          }],
          success_url: `${returnUrl || 'https://deploysafe.in/bookings'}/${bookingId}/success`,
          cancel_url: `${returnUrl || 'https://deploysafe.in/bookings'}/${bookingId}/cancel`,
          metadata: { bookingId },
        });

        await this.prisma.booking.update({
          where: { id: bookingId },
          data: { paymentLink: session.url, paymentStatus: 'pending' },
        });

        return { url: session.url, sessionId: session.id };
      } catch (e) {
        this.logger.error('Stripe payment link creation failed', e);
      }
    }

    const dummyUrl = `https://deploysafe.in/pay/${bookingId}?amount=${booking.price || 0}&currency=${booking.currency}`;
    await this.prisma.booking.update({
      where: { id: bookingId },
      data: { paymentLink: dummyUrl, paymentStatus: 'pending' },
    });

    return { url: dummyUrl };
  }
}
