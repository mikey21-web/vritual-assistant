import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { BookingStatus } from '@prisma/client';

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(private prisma: PrismaService, private config: ConfigService) {}

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

    return this.prisma.booking.create({
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
      },
    });
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

    return this.prisma.booking.update({ where: { id }, data });
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
