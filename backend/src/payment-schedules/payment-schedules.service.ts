import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BookingLifecycleService } from '../bookings/booking-lifecycle.service';
import { PaymentScheduleStatus } from '@prisma/client';

@Injectable()
export class PaymentSchedulesService {
  private readonly logger = new Logger(PaymentSchedulesService.name);

  constructor(
    private prisma: PrismaService,
    private lifecycle: BookingLifecycleService,
  ) {}

  async create(data: {
    tenantId: string;
    leadId: string;
    bookingId?: string;
    label: string;
    amount: number;
    currency?: string;
    dueDate?: string;
    notes?: string;
  }) {
    const ps = await this.prisma.paymentSchedule.create({
      data: {
        tenantId: data.tenantId,
        leadId: data.leadId,
        bookingId: data.bookingId,
        label: data.label,
        amount: data.amount,
        currency: data.currency || 'INR',
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        notes: data.notes,
      },
    });

    try {
      await this.lifecycle.schedulePaymentReminders(ps);
    } catch (e: any) {
      this.logger.warn(`Failed to schedule payment reminders for ${ps.id}: ${e.message}`);
    }
    return ps;
  }

  findAll(query: { leadId?: string; bookingId?: string; status?: string; page?: number; limit?: number }) {
    const { leadId, bookingId, status, page = 1, limit = 50 } = query;
    const where: any = {};
    if (leadId) where.leadId = leadId;
    if (bookingId) where.bookingId = bookingId;
    if (status) where.status = status;
    return this.prisma.paymentSchedule.findMany({
      where,
      skip: (+page - 1) * +limit,
      take: +limit,
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
      include: { lead: { select: { id: true, contact: { select: { name: true, phone: true } } } } },
    });
  }

  async findOne(id: string) {
    const ps = await this.prisma.paymentSchedule.findUnique({ where: { id } });
    if (!ps) throw new NotFoundException('Payment schedule not found');
    return ps;
  }

  async update(id: string, data: any) {
    const existing = await this.findOne(id);
    const updated = await this.prisma.paymentSchedule.update({
      where: { id },
      data: {
        ...data,
        dueDate: data.dueDate !== undefined ? (data.dueDate ? new Date(data.dueDate) : null) : undefined,
      },
    });

    try {
      const statusChanged = data.status && data.status !== existing.status;
      const dueChanged = data.dueDate !== undefined;

      if (statusChanged && (updated.status === PaymentScheduleStatus.PAID || updated.status === PaymentScheduleStatus.WAIVED)) {
        // Collected (or written off) — stop nudging.
        await this.lifecycle.cancelPaymentReminders(id);
        if (updated.status === PaymentScheduleStatus.PAID && !updated.paidAt) {
          await this.prisma.paymentSchedule.update({ where: { id }, data: { paidAt: new Date() } });
        }
      } else if (dueChanged && updated.status === PaymentScheduleStatus.PENDING) {
        // Due date moved — re-arm reminders against the new date.
        await this.lifecycle.cancelPaymentReminders(id);
        await this.lifecycle.schedulePaymentReminders(updated);
      }
    } catch (e: any) {
      this.logger.warn(`Payment schedule ${id} lifecycle hook failed: ${e.message}`);
    }

    return updated;
  }

  async markPaid(id: string) {
    await this.findOne(id);
    await this.lifecycle.cancelPaymentReminders(id);
    return this.prisma.paymentSchedule.update({
      where: { id },
      data: { status: PaymentScheduleStatus.PAID, paidAt: new Date() },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.lifecycle.cancelPaymentReminders(id);
    return this.prisma.paymentSchedule.delete({ where: { id } });
  }
}
