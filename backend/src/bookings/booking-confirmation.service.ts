import { Injectable, NotFoundException, ForbiddenException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TimelineService } from '../timeline/timeline.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { BookingStatus, UnitStatus, UnitHoldStatus, CostSheetStatus, BuyerDocumentStatus } from '@prisma/client';

const REQUIRED_DOC_TYPES = ['PAN', 'ADDRESS_PROOF'] as const;

@Injectable()
export class BookingConfirmationService {
  constructor(
    private prisma: PrismaService,
    private timeline: TimelineService,
    private auditLogs: AuditLogsService,
  ) {}

  /** Creates the DRAFT purchase booking that confirm() later gates and transitions. */
  async createDraft(data: { tenantId: string; leadId: string; unitId: string; costSheetId: string; createdById?: string }) {
    const unit = await this.prisma.unit.findFirst({ where: { id: data.unitId, tenantId: data.tenantId } });
    if (!unit) throw new NotFoundException('Unit not found');
    const costSheet = await this.prisma.costSheet.findFirst({ where: { id: data.costSheetId, tenantId: data.tenantId } });
    if (!costSheet) throw new NotFoundException('Cost sheet not found');

    const booking = await this.prisma.booking.create({
      data: {
        tenantId: data.tenantId,
        leadId: data.leadId,
        unitId: data.unitId,
        costSheetId: data.costSheetId,
        title: `Booking — Unit ${unit.unitNumber}`,
        startTime: new Date(),
        status: BookingStatus.PENDING,
      },
    });

    await this.timeline.add({
      type: 'booking_draft_created',
      title: `Booking draft created for unit ${unit.unitNumber}`,
      leadId: data.leadId,
      metadata: { bookingId: booking.id, unitId: data.unitId },
      createdById: data.createdById,
    });
    return booking;
  }

  /**
   * Confirms a purchase booking only when every precondition in spec 48.9
   * passes: an active hold on this unit for this lead (or an authorised
   * manager override), an approved+unexpired cost sheet, required documents
   * verified, and a recorded booking amount. All status changes happen in one
   * transaction; a second confirm on an already-CONFIRMED booking is a no-op
   * (idempotent) rather than an error.
   */
  async confirm(tenantId: string, bookingId: string, data: {
    applicants: { name: string; contactId?: string; panMasked?: string; addressSnapshot?: Record<string, unknown>; role?: 'PRIMARY' | 'CO_APPLICANT' }[];
    bookingAmountPaise: number;
    overrideMissingHold?: boolean;
    actorId?: string;
  }) {
    const booking = await this.prisma.booking.findFirst({ where: { id: bookingId, tenantId } });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.status === BookingStatus.CONFIRMED) return booking; // idempotent

    if (booking.status !== BookingStatus.PENDING) {
      throw new ForbiddenException(`Booking is ${booking.status} and cannot be confirmed`);
    }
    if (!booking.unitId) throw new BadRequestException('Booking has no unit selected');
    if (!data.applicants || data.applicants.length === 0) throw new BadRequestException('At least one applicant is required');
    if (!data.bookingAmountPaise || data.bookingAmountPaise <= 0) {
      throw new ConflictException({ code: 'APPROVAL_REQUIRED', message: 'A recorded booking amount is required before confirmation' });
    }

    const unit = await this.prisma.unit.findUniqueOrThrow({ where: { id: booking.unitId } });

    const activeHold = await this.prisma.unitHold.findFirst({
      where: { unitId: unit.id, leadId: booking.leadId, status: UnitHoldStatus.ACTIVE },
    });
    if (!activeHold && !data.overrideMissingHold) {
      throw new ConflictException({ code: 'HOLD_EXPIRED', message: 'No active hold on this unit for this lead' });
    }

    if (booking.costSheetId) {
      const costSheet = await this.prisma.costSheet.findUniqueOrThrow({ where: { id: booking.costSheetId } });
      const approvedStatuses: CostSheetStatus[] = [CostSheetStatus.APPROVED, CostSheetStatus.SENT];
      const validStatus = approvedStatuses.includes(costSheet.status);
      if (!validStatus) {
        throw new ConflictException({ code: 'APPROVAL_REQUIRED', message: `Cost sheet is ${costSheet.status}, not approved` });
      }
      if (costSheet.expiresAt && costSheet.expiresAt < new Date()) {
        throw new ConflictException({ code: 'APPROVAL_REQUIRED', message: 'Cost sheet has expired' });
      }
    }

    const docs = await this.prisma.buyerDocument.findMany({ where: { tenantId, leadId: booking.leadId } });
    const verifiedTypes = new Set(docs.filter(d => d.status === BuyerDocumentStatus.VERIFIED || d.status === BuyerDocumentStatus.WAIVED).map(d => d.type));
    const missing = REQUIRED_DOC_TYPES.filter(t => !verifiedTypes.has(t as any));
    if (missing.length > 0) {
      throw new ConflictException({ code: 'DOCUMENTS_INCOMPLETE', message: `Missing verified documents: ${missing.join(', ')}` });
    }

    const bookingNumber = `BK-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    const confirmed = await this.prisma.$transaction(async (tx) => {
      const claim = await tx.unit.updateMany({
        where: { id: unit.id, version: unit.version, status: UnitStatus.ON_HOLD },
        data: { status: UnitStatus.BOOKED, version: { increment: 1 } },
      });
      if (claim.count === 0) {
        throw new ConflictException({ code: 'UNIT_NOT_AVAILABLE', message: 'Unit is no longer available to book' });
      }

      if (activeHold) {
        await tx.unitHold.update({ where: { id: activeHold.id }, data: { status: UnitHoldStatus.CONSUMED } });
      }

      await tx.unitStatusHistory.create({
        data: { unitId: unit.id, fromStatus: UnitStatus.ON_HOLD, toStatus: UnitStatus.BOOKED, reason: 'booking_confirmed', changedById: data.actorId },
      });

      const b = await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: BookingStatus.CONFIRMED,
          bookingNumber,
          bookingAmountPaise: BigInt(data.bookingAmountPaise),
          confirmedById: data.actorId,
          confirmedAt: new Date(),
          version: { increment: 1 },
          applicants: {
            create: data.applicants.map(a => ({
              name: a.name,
              contactId: a.contactId,
              panMasked: a.panMasked,
              addressSnapshot: (a.addressSnapshot || {}) as any,
              role: a.role || 'PRIMARY',
            })),
          },
        },
      });

      await tx.bookingStatusHistoryEntry.create({
        data: { bookingId, fromStatus: booking.status, toStatus: BookingStatus.CONFIRMED, reason: 'confirmed', changedById: data.actorId },
      });

      return b;
    });

    await this.timeline.add({
      type: 'booking_confirmed',
      title: `Booking confirmed — ${bookingNumber}`,
      leadId: booking.leadId,
      metadata: { bookingId, bookingNumber, unitId: unit.id },
      createdById: data.actorId,
    });
    await this.auditLogs.log('CONFIRM', 'Booking', bookingId, data.actorId, { bookingNumber });

    return this.serializable(confirmed);
  }

  async cancel(tenantId: string, bookingId: string, reason: string, actorId?: string) {
    const booking = await this.prisma.booking.findFirst({ where: { id: bookingId, tenantId } });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new ForbiddenException(`Only a CONFIRMED booking can be cancelled this way (current: ${booking.status})`);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      if (booking.unitId) {
        const unit = await tx.unit.findUnique({ where: { id: booking.unitId } });
        if (unit && unit.status === UnitStatus.BOOKED) {
          await tx.unit.update({ where: { id: unit.id }, data: { status: UnitStatus.AVAILABLE, leadId: null, version: { increment: 1 } } });
          await tx.unitStatusHistory.create({
            data: { unitId: unit.id, fromStatus: UnitStatus.BOOKED, toStatus: UnitStatus.AVAILABLE, reason: `booking_cancelled: ${reason}`, changedById: actorId },
          });
        }
      }
      const b = await tx.booking.update({ where: { id: bookingId }, data: { status: BookingStatus.CANCELLED, cancellationReason: reason } });
      await tx.bookingStatusHistoryEntry.create({
        data: { bookingId, fromStatus: booking.status, toStatus: BookingStatus.CANCELLED, reason, changedById: actorId },
      });
      return b;
    });

    await this.timeline.add({ type: 'booking_cancelled', title: `Booking cancelled: ${reason}`, leadId: booking.leadId, metadata: { bookingId }, createdById: actorId });
    await this.auditLogs.log('CANCEL', 'Booking', bookingId, actorId, { reason });
    return this.serializable(updated);
  }

  private serializable(booking: any) {
    return { ...booking, bookingAmountPaise: booking.bookingAmountPaise?.toString() };
  }
}
