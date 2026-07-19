import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TimelineService } from '../timeline/timeline.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CaseStatus, RefundCaseStatus, UnitStatus } from '@prisma/client';

/** Transfer, unit-shift, cancellation, refund — the exception journeys off the main post-sales lifecycle (spec 67.3). One service: same request→approve→complete shape, no reason to split into four modules. */
@Injectable()
export class PostSalesCasesService {
  constructor(
    private prisma: PrismaService,
    private timeline: TimelineService,
    private auditLogs: AuditLogsService,
  ) {}

  // ── Transfer ──
  async requestTransfer(tenantId: string, data: { bookingId: string; fromApplicantContactId?: string; toApplicantName: string; toApplicantContactId?: string; toApplicantPanMasked?: string; reason?: string; chargesPaise?: number }, actorId?: string) {
    await this.requireBooking(tenantId, data.bookingId);
    const c = await this.prisma.transferCase.create({
      data: { tenantId, ...data, chargesPaise: data.chargesPaise != null ? BigInt(data.chargesPaise) : undefined, requestedById: actorId },
    });
    await this.timeline.add({ type: 'transfer_requested', title: `Transfer requested: ${data.toApplicantName}`, metadata: { bookingId: data.bookingId, transferCaseId: c.id }, createdById: actorId });
    return this.ser(c);
  }

  async decideTransfer(tenantId: string, id: string, decision: 'APPROVED' | 'REJECTED', actorId?: string, reason?: string) {
    const c = await this.requireCase(this.prisma.transferCase, tenantId, id, [CaseStatus.REQUESTED, CaseStatus.UNDER_REVIEW]);
    const updated = await this.prisma.transferCase.update({ where: { id }, data: { status: decision, approvedById: actorId, decidedAt: new Date(), reason: reason || c.reason } });
    await this.auditLogs.log(decision, 'TransferCase', id, actorId, { reason });
    return this.ser(updated);
  }

  async completeTransfer(tenantId: string, id: string, actorId?: string) {
    const c = await this.requireCase(this.prisma.transferCase, tenantId, id, [CaseStatus.APPROVED]);
    const applicant = await this.prisma.bookingApplicant.findFirst({ where: { bookingId: c.bookingId, role: 'PRIMARY' } });
    const updated = await this.prisma.$transaction(async (tx) => {
      if (applicant) {
        await tx.bookingApplicant.update({ where: { id: applicant.id }, data: { name: c.toApplicantName, contactId: c.toApplicantContactId, panMasked: c.toApplicantPanMasked } });
      } else {
        await tx.bookingApplicant.create({ data: { bookingId: c.bookingId, name: c.toApplicantName, contactId: c.toApplicantContactId, panMasked: c.toApplicantPanMasked, role: 'PRIMARY' } });
      }
      return tx.transferCase.update({ where: { id }, data: { status: CaseStatus.COMPLETED, completedAt: new Date() } });
    });
    await this.timeline.add({ type: 'transfer_completed', title: 'Applicant transfer completed', metadata: { bookingId: c.bookingId, transferCaseId: id }, createdById: actorId });
    return this.ser(updated);
  }

  // ── Unit shift ──
  async requestUnitShift(tenantId: string, data: { bookingId: string; toUnitId: string; priceDifferencePaise?: number; reason?: string }, actorId?: string) {
    const booking = await this.requireBooking(tenantId, data.bookingId);
    if (!booking.unitId) throw new BadRequestException('Booking has no current unit to shift from');
    const toUnit = await this.prisma.unit.findFirst({ where: { id: data.toUnitId, tenantId } });
    if (!toUnit) throw new NotFoundException('Target unit not found');
    if (toUnit.status !== UnitStatus.AVAILABLE) throw new ForbiddenException(`Target unit is ${toUnit.status}, not AVAILABLE`);

    const c = await this.prisma.unitShiftCase.create({
      data: { tenantId, bookingId: data.bookingId, fromUnitId: booking.unitId, toUnitId: data.toUnitId, priceDifferencePaise: data.priceDifferencePaise != null ? BigInt(data.priceDifferencePaise) : undefined, reason: data.reason, requestedById: actorId },
    });
    return this.ser(c);
  }

  async decideUnitShift(tenantId: string, id: string, decision: 'APPROVED' | 'REJECTED', actorId?: string) {
    const c = await this.requireCase(this.prisma.unitShiftCase, tenantId, id, [CaseStatus.REQUESTED]);
    const updated = await this.prisma.unitShiftCase.update({ where: { id }, data: { status: decision, approvedById: actorId, decidedAt: new Date() } });
    await this.auditLogs.log(decision, 'UnitShiftCase', id, actorId, {});
    return this.ser(updated);
  }

  /** Both units transition atomically — the new one only if it's still AVAILABLE (spec 67.3). */
  async completeUnitShift(tenantId: string, id: string, actorId?: string) {
    const c = await this.requireCase(this.prisma.unitShiftCase, tenantId, id, [CaseStatus.APPROVED]);
    const updated = await this.prisma.$transaction(async (tx) => {
      const toUnit = await tx.unit.findUniqueOrThrow({ where: { id: c.toUnitId } });
      const claim = await tx.unit.updateMany({ where: { id: c.toUnitId, version: toUnit.version, status: UnitStatus.AVAILABLE }, data: { status: UnitStatus.BOOKED, version: { increment: 1 } } });
      if (claim.count === 0) throw new ForbiddenException('Target unit was claimed by someone else since approval');

      const fromUnit = await tx.unit.findUnique({ where: { id: c.fromUnitId } });
      if (fromUnit) await tx.unit.update({ where: { id: c.fromUnitId }, data: { status: UnitStatus.AVAILABLE, leadId: null, version: { increment: 1 } } });

      await tx.unitStatusHistory.createMany({
        data: [
          { unitId: c.fromUnitId, fromStatus: UnitStatus.BOOKED, toStatus: UnitStatus.AVAILABLE, reason: `unit_shift:${id}`, changedById: actorId },
          { unitId: c.toUnitId, fromStatus: UnitStatus.AVAILABLE, toStatus: UnitStatus.BOOKED, reason: `unit_shift:${id}`, changedById: actorId },
        ],
      });

      await tx.booking.update({ where: { id: c.bookingId }, data: { unitId: c.toUnitId } });
      return tx.unitShiftCase.update({ where: { id }, data: { status: CaseStatus.COMPLETED, completedAt: new Date() } });
    });
    await this.timeline.add({ type: 'unit_shift_completed', title: 'Unit shift completed', metadata: { bookingId: c.bookingId, unitShiftCaseId: id }, createdById: actorId });
    return this.ser(updated);
  }

  // ── Cancellation ──
  async requestCancellation(tenantId: string, data: { bookingId: string; reason: string; deductionAmountPaise?: number; refundPayablePaise?: number }, actorId?: string) {
    await this.requireBooking(tenantId, data.bookingId);
    const c = await this.prisma.cancellationCase.create({
      data: { tenantId, bookingId: data.bookingId, reason: data.reason, deductionAmountPaise: data.deductionAmountPaise != null ? BigInt(data.deductionAmountPaise) : undefined, refundPayablePaise: data.refundPayablePaise != null ? BigInt(data.refundPayablePaise) : undefined, requestedById: actorId },
    });
    return this.ser(c);
  }

  async decideCancellation(tenantId: string, id: string, decision: 'APPROVED' | 'REJECTED', actorId?: string) {
    const c = await this.requireCase(this.prisma.cancellationCase, tenantId, id, [CaseStatus.REQUESTED, CaseStatus.UNDER_REVIEW]);
    const updated = await this.prisma.cancellationCase.update({ where: { id }, data: { status: decision, approvedById: actorId, decidedAt: new Date() } });
    await this.auditLogs.log(decision, 'CancellationCase', id, actorId, {});
    return this.ser(updated);
  }

  /** Releases the unit and, if a refund is payable, creates the RefundCase in the same transaction — never a dangling cancellation with money owed and no tracked refund. */
  async completeCancellation(tenantId: string, id: string, actorId?: string) {
    const c = await this.requireCase(this.prisma.cancellationCase, tenantId, id, [CaseStatus.APPROVED]);
    const booking = await this.prisma.booking.findUniqueOrThrow({ where: { id: c.bookingId } });

    const updated = await this.prisma.$transaction(async (tx) => {
      if (booking.unitId) {
        const unit = await tx.unit.findUnique({ where: { id: booking.unitId } });
        if (unit && unit.status === UnitStatus.BOOKED) {
          await tx.unit.update({ where: { id: unit.id }, data: { status: UnitStatus.AVAILABLE, leadId: null, version: { increment: 1 } } });
          await tx.unitStatusHistory.create({ data: { unitId: unit.id, fromStatus: UnitStatus.BOOKED, toStatus: UnitStatus.AVAILABLE, reason: `cancellation:${id}`, changedById: actorId } });
        }
      }
      await tx.booking.update({ where: { id: c.bookingId }, data: { status: 'CANCELLED', cancellationReason: c.reason } });

      if (c.refundPayablePaise && c.refundPayablePaise > BigInt(0)) {
        await tx.refundCase.create({ data: { tenantId, bookingId: c.bookingId, cancellationCaseId: id, amountPaise: c.refundPayablePaise, requestedById: actorId } });
      }
      return tx.cancellationCase.update({ where: { id }, data: { status: CaseStatus.COMPLETED, completedAt: new Date() } });
    });
    await this.timeline.add({ type: 'cancellation_completed', title: `Booking cancelled: ${c.reason}`, metadata: { bookingId: c.bookingId, cancellationCaseId: id }, createdById: actorId });
    return this.ser(updated);
  }

  // ── Refund ──
  async requestRefund(tenantId: string, data: { bookingId: string; amountPaise: number }, actorId?: string) {
    await this.requireBooking(tenantId, data.bookingId);
    const c = await this.prisma.refundCase.create({ data: { tenantId, bookingId: data.bookingId, amountPaise: BigInt(data.amountPaise), requestedById: actorId } });
    return this.ser(c);
  }

  async verifyRefundBankAccount(tenantId: string, id: string, actorId?: string) {
    const c = await this.requireCase(this.prisma.refundCase, tenantId, id, [RefundCaseStatus.REQUESTED, RefundCaseStatus.APPROVED]);
    return this.ser(await this.prisma.refundCase.update({ where: { id }, data: { bankAccountVerified: true } }));
  }

  /** Never marks paid without a verified bank account (spec 67.3) — this is a money-out action, never automated. */
  async approveRefund(tenantId: string, id: string, actorId?: string) {
    const c = await this.requireCase(this.prisma.refundCase, tenantId, id, [RefundCaseStatus.REQUESTED]);
    if (!c.bankAccountVerified) throw new ForbiddenException('Bank account must be verified before a refund can be approved');
    const updated = await this.prisma.refundCase.update({ where: { id }, data: { status: RefundCaseStatus.APPROVED, approvedById: actorId, decidedAt: new Date() } });
    await this.auditLogs.log('APPROVE', 'RefundCase', id, actorId, {});
    return this.ser(updated);
  }

  async markRefundPaid(tenantId: string, id: string, paymentReference: string, actorId?: string) {
    const c = await this.requireCase(this.prisma.refundCase, tenantId, id, [RefundCaseStatus.APPROVED, RefundCaseStatus.PROCESSING]);
    const updated = await this.prisma.$transaction([
      this.prisma.refundCase.update({ where: { id }, data: { status: RefundCaseStatus.PAID, paymentReference, paidAt: new Date() } }),
      this.prisma.ledgerEntry.create({ data: { tenantId, leadId: (await this.prisma.booking.findUniqueOrThrow({ where: { id: c.bookingId } })).leadId, bookingId: c.bookingId, type: 'REFUND', amountPaise: c.amountPaise, description: `Refund paid: ${paymentReference}`, createdById: actorId } }),
    ]);
    await this.auditLogs.log('MARK_PAID', 'RefundCase', id, actorId, { paymentReference });
    return this.ser(updated[0]);
  }

  async findCasesForBooking(tenantId: string, bookingId: string) {
    const [transfers, unitShifts, cancellations, refunds] = await Promise.all([
      this.prisma.transferCase.findMany({ where: { tenantId, bookingId } }),
      this.prisma.unitShiftCase.findMany({ where: { tenantId, bookingId } }),
      this.prisma.cancellationCase.findMany({ where: { tenantId, bookingId } }),
      this.prisma.refundCase.findMany({ where: { tenantId, bookingId } }),
    ]);
    return {
      transfers: transfers.map(t => this.ser(t)),
      unitShifts: unitShifts.map(u => this.ser(u)),
      cancellations: cancellations.map(c => this.ser(c)),
      refunds: refunds.map(r => this.ser(r)),
    };
  }

  private async requireBooking(tenantId: string, bookingId: string) {
    const booking = await this.prisma.booking.findFirst({ where: { id: bookingId, tenantId } });
    if (!booking) throw new NotFoundException('Booking not found');
    return booking;
  }

  private async requireCase(model: any, tenantId: string, id: string, allowed: string[]) {
    const c = await model.findFirst({ where: { id, tenantId } });
    if (!c) throw new NotFoundException('Case not found');
    if (!allowed.includes(c.status)) throw new ForbiddenException(`Case is ${c.status} and cannot transition this way`);
    return c;
  }

  private ser(c: any) {
    return {
      ...c,
      chargesPaise: c.chargesPaise?.toString(),
      priceDifferencePaise: c.priceDifferencePaise?.toString(),
      deductionAmountPaise: c.deductionAmountPaise?.toString(),
      refundPayablePaise: c.refundPayablePaise?.toString(),
      amountPaise: c.amountPaise?.toString(),
    };
  }
}
