import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { LedgerEntryType, PaymentScheduleStatus } from '@prisma/client';

/** Overdue interest + credit notes — tenant-configured rate, never hardcoded (spec 67.4). Rate math lives here since it's the one money-critical formula; keep it small and tested. */
@Injectable()
export class InterestService {
  constructor(
    private prisma: PrismaService,
    private auditLogs: AuditLogsService,
  ) {}

  createPolicy(tenantId: string, data: { name: string; ratePercentPerMonth: number; graceDays?: number }) {
    return this.prisma.interestPolicy.create({ data: { tenantId, ...data } });
  }

  findPolicies(tenantId: string) {
    return this.prisma.interestPolicy.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' } });
  }

  /**
   * Simple monthly-rate proration on days overdue past the grace period.
   * amountPaise * (ratePercentPerMonth/100) * (overdueDays/30). Rounds down —
   * never charge more than the formula produces.
   */
  async computeOverdueCharge(tenantId: string, paymentScheduleId: string, policyId: string, actorId?: string) {
    const schedule = await this.prisma.paymentSchedule.findFirst({ where: { id: paymentScheduleId, tenantId } });
    if (!schedule) throw new NotFoundException('Payment schedule not found');
    if (schedule.status !== PaymentScheduleStatus.OVERDUE) throw new ForbiddenException('Schedule is not OVERDUE');
    if (!schedule.dueDate) throw new ForbiddenException('Schedule has no due date to compute overdue days from');

    const policy = await this.prisma.interestPolicy.findFirst({ where: { id: policyId, tenantId, active: true } });
    if (!policy) throw new NotFoundException('Active interest policy not found');

    const overdueDays = Math.max(0, Math.floor((Date.now() - schedule.dueDate.getTime()) / 86400000) - policy.graceDays);
    if (overdueDays <= 0) return { chargedPaise: '0', overdueDays: 0 };

    const amountPaise = Math.round(schedule.amount * 100); // legacy Float rupees -> paise for this one-off charge
    const chargePaise = Math.floor(amountPaise * (policy.ratePercentPerMonth / 100) * (overdueDays / 30));

    if (chargePaise > 0) {
      await this.prisma.ledgerEntry.create({
        data: {
          tenantId,
          leadId: schedule.leadId,
          bookingId: schedule.bookingId,
          type: LedgerEntryType.DEBIT,
          amountPaise: BigInt(chargePaise),
          description: `Overdue interest (${overdueDays}d @ ${policy.ratePercentPerMonth}%/mo, policy "${policy.name}")`,
          createdById: actorId,
        },
      });
      await this.auditLogs.log('CHARGE_INTEREST', 'PaymentSchedule', paymentScheduleId, actorId, { overdueDays, chargePaise, policyId });
    }

    return { chargedPaise: chargePaise.toString(), overdueDays };
  }

  async createCreditNote(tenantId: string, data: { bookingId: string; type: 'WAIVER' | 'CORRECTION'; amountPaise: number; reason: string }, approvedById: string) {
    const booking = await this.prisma.booking.findFirst({ where: { id: data.bookingId, tenantId } });
    if (!booking) throw new NotFoundException('Booking not found');

    const [note] = await this.prisma.$transaction([
      this.prisma.creditNote.create({ data: { tenantId, bookingId: data.bookingId, type: data.type, amountPaise: BigInt(data.amountPaise), reason: data.reason, approvedById } }),
      this.prisma.ledgerEntry.create({ data: { tenantId, leadId: booking.leadId, bookingId: data.bookingId, type: LedgerEntryType.CREDIT, amountPaise: BigInt(data.amountPaise), description: `${data.type}: ${data.reason}`, createdById: approvedById } }),
    ]);
    return { ...note, amountPaise: note.amountPaise.toString() };
  }

  findCreditNotes(tenantId: string, bookingId: string) {
    return this.prisma.creditNote.findMany({ where: { tenantId, bookingId } }).then(notes => notes.map(n => ({ ...n, amountPaise: n.amountPaise.toString() })));
  }
}
