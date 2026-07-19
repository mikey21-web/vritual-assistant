import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConstructionErpService } from '../construction-erp/construction-erp.service';

/**
 * Every method here takes the bookingId/leadId directly from the verified
 * buyer JWT (never from a request param) — a buyer session can only ever see
 * its own booking (spec 54.1). Internal notes, other applicants' documents,
 * cost-sheet formulas, and unapproved documents are never exposed.
 */
@Injectable()
export class BuyerPortalService {
  constructor(
    private prisma: PrismaService,
    private constructionErp: ConstructionErpService,
  ) {}

  async getBooking(tenantId: string, bookingId: string) {
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, tenantId },
      select: {
        id: true, bookingNumber: true, status: true, bookingAmountPaise: true, confirmedAt: true,
        unitId: true,
        unit: { select: { unitNumber: true, floor: true, unitType: true, areaSqft: true, projectId: true } },
        applicants: { select: { name: true, role: true } },
      },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    return { ...booking, bookingAmountPaise: booking.bookingAmountPaise?.toString() };
  }

  async getPaymentSchedule(tenantId: string, bookingId: string) {
    return this.prisma.paymentSchedule.findMany({
      where: { tenantId, bookingId },
      select: { id: true, label: true, amount: true, currency: true, dueDate: true, status: true, paidAt: true },
      orderBy: { dueDate: 'asc' },
    });
  }

  async getReceipts(tenantId: string, bookingId: string) {
    const receipts = await this.prisma.paymentReceipt.findMany({
      where: { tenantId, bookingId, status: 'CONFIRMED' },
      select: { id: true, amountPaise: true, mode: true, receivedAt: true, externalRef: true },
      orderBy: { receivedAt: 'desc' },
    });
    return receipts.map(r => ({ ...r, amountPaise: r.amountPaise.toString() }));
  }

  /** Only fully-generated documents that are demand letters or agreements — never a draft awaiting internal review. */
  async getDocuments(tenantId: string, bookingId: string) {
    const docs = await this.prisma.generatedDocument.findMany({
      where: { tenantId, bookingId },
      select: { id: true, snapshot: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    return docs.map(d => ({ id: d.id, documentType: (d.snapshot as any)?.documentType, createdAt: d.createdAt }));
  }

  /** The buyer's own KYC checklist — status only, never another applicant's document. */
  async getKycChecklist(tenantId: string, leadId: string) {
    return this.prisma.buyerDocument.findMany({
      where: { tenantId, leadId },
      select: { id: true, type: true, status: true, rejectionReason: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Only approved-for-buyers construction updates for this booking's project (spec 68.1). */
  async getConstructionUpdates(tenantId: string, bookingId: string) {
    const booking = await this.prisma.booking.findFirst({ where: { id: bookingId, tenantId }, select: { unit: { select: { projectId: true } } } });
    if (!booking?.unit?.projectId) return [];
    return this.constructionErp.getBuyerVisibleMilestones(tenantId, booking.unit.projectId);
  }
}
