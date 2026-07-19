import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TimelineService } from '../timeline/timeline.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { BuyerDocumentStatus, KycVerificationType, KycVerificationStatus } from '@prisma/client';

@Injectable()
export class KycService {
  constructor(
    private prisma: PrismaService,
    private timeline: TimelineService,
    private auditLogs: AuditLogsService,
  ) {}

  async request(tenantId: string, data: { leadId: string; bookingId?: string; type: any; requestedById?: string }) {
    const lead = await this.prisma.lead.findFirst({ where: { id: data.leadId, tenantId } });
    if (!lead) throw new NotFoundException('Lead not found');

    const doc = await this.prisma.buyerDocument.create({
      data: {
        tenantId,
        leadId: data.leadId,
        bookingId: data.bookingId,
        type: data.type,
        status: BuyerDocumentStatus.REQUESTED,
        requestedById: data.requestedById,
      },
    });

    await this.timeline.add({
      type: 'document_requested',
      title: `${data.type.replace(/_/g, ' ')} requested`,
      leadId: data.leadId,
      metadata: { buyerDocumentId: doc.id },
      createdById: data.requestedById,
    });
    return doc;
  }

  async findAll(tenantId: string, query: { leadId?: string; bookingId?: string; status?: string; page?: number; limit?: number }) {
    const { leadId, bookingId, status, page = 1, limit = 20 } = query;
    const where: any = { tenantId };
    if (leadId) where.leadId = leadId;
    if (bookingId) where.bookingId = bookingId;
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.prisma.buyerDocument.findMany({
        where,
        skip: (+page - 1) * +limit,
        take: +limit,
        orderBy: { createdAt: 'desc' },
        include: { mediaFile: { select: { id: true, signedUrl: true, fileName: true } } },
      }),
      this.prisma.buyerDocument.count({ where }),
    ]);
    return { data, meta: { total, page: +page, limit: +limit } };
  }

  async findOne(tenantId: string, id: string) {
    const doc = await this.prisma.buyerDocument.findFirst({
      where: { id, tenantId },
      include: { mediaFile: { select: { id: true, signedUrl: true, fileName: true } }, verifications: true },
    });
    if (!doc) throw new NotFoundException('Buyer document not found');
    return doc;
  }

  /**
   * A document that is uploaded is never automatically VERIFIED (spec 48.10,
   * invariant 7) — it moves to UPLOADED and waits for an explicit review.
   * Re-uploading after a rejection is allowed and clears the old rejection.
   */
  async upload(tenantId: string, id: string, data: { mediaFileId: string; source?: string; documentNumberMasked?: string }) {
    const doc = await this.findOne(tenantId, id);
    if (doc.status === BuyerDocumentStatus.VERIFIED || doc.status === BuyerDocumentStatus.WAIVED) {
      throw new ForbiddenException(`Document is already ${doc.status} and cannot be re-uploaded`);
    }

    const updated = await this.prisma.buyerDocument.update({
      where: { id },
      data: {
        mediaFileId: data.mediaFileId,
        source: data.source || 'buyer_upload',
        documentNumberMasked: data.documentNumberMasked,
        status: BuyerDocumentStatus.UPLOADED,
        rejectionReason: null,
      },
    });

    await this.timeline.add({
      type: 'document_uploaded',
      title: `${doc.type.replace(/_/g, ' ')} uploaded`,
      leadId: doc.leadId,
      metadata: { buyerDocumentId: id },
    });
    await this.auditLogs.log('UPLOAD', 'BuyerDocument', id, undefined, { mediaFileId: data.mediaFileId });
    return updated;
  }

  /** Manager/collections only — enforced by @Roles at the controller. */
  async verify(tenantId: string, id: string, verifiedById: string | undefined, verificationType: KycVerificationType = KycVerificationType.MANUAL) {
    const doc = await this.findOne(tenantId, id);
    if (doc.status !== BuyerDocumentStatus.UPLOADED && doc.status !== BuyerDocumentStatus.PROCESSING) {
      throw new ForbiddenException(`Document is ${doc.status} and is not ready for verification`);
    }

    const [updated] = await this.prisma.$transaction([
      this.prisma.buyerDocument.update({
        where: { id },
        data: { status: BuyerDocumentStatus.VERIFIED, verifiedById, verifiedAt: new Date() },
      }),
      this.prisma.kycVerification.create({
        data: {
          tenantId,
          buyerDocumentId: id,
          leadId: doc.leadId,
          type: verificationType,
          status: KycVerificationStatus.VERIFIED,
          verifiedById,
          verifiedAt: new Date(),
        },
      }),
    ]);

    await this.timeline.add({
      type: 'document_verified',
      title: `${doc.type.replace(/_/g, ' ')} verified`,
      leadId: doc.leadId,
      metadata: { buyerDocumentId: id },
      createdById: verifiedById,
    });
    await this.auditLogs.log('VERIFY', 'BuyerDocument', id, verifiedById, {});
    return updated;
  }

  async reject(tenantId: string, id: string, reason: string, actorId?: string) {
    const doc = await this.findOne(tenantId, id);
    if (doc.status !== BuyerDocumentStatus.UPLOADED && doc.status !== BuyerDocumentStatus.PROCESSING) {
      throw new ForbiddenException(`Document is ${doc.status} and cannot be rejected`);
    }
    const updated = await this.prisma.buyerDocument.update({
      where: { id },
      data: { status: BuyerDocumentStatus.REJECTED, rejectionReason: reason },
    });
    await this.timeline.add({
      type: 'document_rejected',
      title: `${doc.type.replace(/_/g, ' ')} rejected: ${reason}`,
      leadId: doc.leadId,
      metadata: { buyerDocumentId: id, reason },
      createdById: actorId,
    });
    await this.auditLogs.log('REJECT', 'BuyerDocument', id, actorId, { reason });
    return updated;
  }

  async waive(tenantId: string, id: string, reason: string, actorId?: string) {
    const doc = await this.findOne(tenantId, id);
    const updated = await this.prisma.buyerDocument.update({
      where: { id },
      data: { status: BuyerDocumentStatus.WAIVED, rejectionReason: reason },
    });
    await this.auditLogs.log('WAIVE', 'BuyerDocument', id, actorId, { reason });
    return updated;
  }

  /** Missing-documents queue for a lead/booking — required before booking confirmation per spec 48.9. */
  async findMissing(tenantId: string, leadId: string) {
    const docs = await this.prisma.buyerDocument.findMany({ where: { tenantId, leadId } });
    const done: BuyerDocumentStatus[] = [BuyerDocumentStatus.VERIFIED, BuyerDocumentStatus.WAIVED];
    return docs.filter(d => !done.includes(d.status));
  }
}
