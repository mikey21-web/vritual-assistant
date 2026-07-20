import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { LedgerEntryType, PaymentScheduleStatus } from '@prisma/client';

/** Overdue interest + credit notes — tenant-configured rate, never hardcoded (spec 67.4). Rate math lives here since it's the one money-critical formula; keep it small and tested. */
@Injectable()
export class InterestService {
  private logger = new Logger(InterestService.name);

  constructor(
    private prisma: PrismaService,
    private auditLogs: AuditLogsService,
  ) {}

  /** Daily at midnight: post overdue interest for every OVERDUE schedule that hasn't been charged this month. */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async scanOverdueCharges() {
    this.logger.log('Scanning overdue schedules for interest charges...');
    const schedules = await this.prisma.paymentSchedule.findMany({
      where: { status: PaymentScheduleStatus.OVERDUE, dueDate: { not: null } },
    });
    this.logger.log(`Found ${schedules.length} overdue schedules`);

    const policies = await this.prisma.interestPolicy.findMany({ where: { active: true } });
    if (policies.length === 0) {
      this.logger.warn('No active interest policies — skipping overdue charge scan');
      return;
    }
    // Use the first active policy as the default
    const policy = policies[0];
    if (policies.length > 1) {
      this.logger.warn(`Multiple active policies found (${policies.length}), using first: "${policy.name}"`);
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    for (const schedule of schedules) {
      try {
        // Avoid duplicates: skip if a DEBIT entry for this schedule was already posted this month
        const alreadyCharged = await this.prisma.ledgerEntry.findFirst({
          where: {
            tenantId: schedule.tenantId,
            leadId: schedule.leadId,
            bookingId: schedule.bookingId,
            type: LedgerEntryType.DEBIT,
            description: { startsWith: 'Overdue interest' },
            createdAt: { gte: startOfMonth },
          },
        });
        if (alreadyCharged) continue;

        if (!schedule.dueDate) continue;
        const overdueDays = Math.max(0, Math.floor((now.getTime() - schedule.dueDate.getTime()) / 86400000) - policy.graceDays);
        if (overdueDays <= 0) continue;

        const amountPaise = Math.round(schedule.amount * 100);
        const chargePaise = Math.floor(amountPaise * (policy.ratePercentPerMonth / 100) * (overdueDays / 30));
        if (chargePaise <= 0) continue;

        await this.prisma.ledgerEntry.create({
          data: {
            tenantId: schedule.tenantId,
            leadId: schedule.leadId,
            bookingId: schedule.bookingId,
            type: LedgerEntryType.DEBIT,
            amountPaise: BigInt(chargePaise),
            description: `Overdue interest (${overdueDays}d @ ${policy.ratePercentPerMonth}%/mo, policy "${policy.name}")`,
            createdById: undefined,
          },
        });
        await this.auditLogs.log('CHARGE_INTEREST', 'PaymentSchedule', schedule.id, undefined, { overdueDays, chargePaise, policyId: policy.id });
        this.logger.log(`Charged ₹${(chargePaise / 100).toFixed(2)} on schedule ${schedule.id} (${overdueDays}d overdue)`);
      } catch (err) {
        this.logger.error(`Failed to charge interest on schedule ${schedule.id}`, (err as Error).stack);
      }
    }
    this.logger.log('Overdue interest scan complete');
  }

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
