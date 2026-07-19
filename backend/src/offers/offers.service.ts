import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TimelineService } from '../timeline/timeline.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { OfferStatus, OfferDecision } from '@prisma/client';

@Injectable()
export class OffersService {
  constructor(
    private prisma: PrismaService,
    private timeline: TimelineService,
    private auditLogs: AuditLogsService,
  ) {}

  async request(tenantId: string, data: {
    costSheetId: string;
    discountPaise?: number;
    discountPercent?: number;
    reason?: string;
    expiresAt?: Date;
    requestedById?: string;
  }) {
    const sheet = await this.prisma.costSheet.findFirst({ where: { id: data.costSheetId, tenantId } });
    if (!sheet) throw new NotFoundException('Cost sheet not found');

    let proposedValuePaise: bigint | undefined;
    if (data.discountPaise != null) {
      proposedValuePaise = sheet.totalPaise - BigInt(data.discountPaise);
    } else if (data.discountPercent != null) {
      proposedValuePaise = sheet.totalPaise - (sheet.totalPaise * BigInt(Math.round(data.discountPercent * 100))) / BigInt(10000);
    }

    const offer = await this.prisma.offer.create({
      data: {
        tenantId,
        costSheetId: data.costSheetId,
        leadId: sheet.leadId,
        requestedById: data.requestedById,
        discountPaise: data.discountPaise != null ? BigInt(data.discountPaise) : undefined,
        discountPercent: data.discountPercent,
        reason: data.reason,
        proposedValuePaise,
        expiresAt: data.expiresAt,
      },
    });

    await this.timeline.add({
      type: 'offer_requested',
      title: 'Discount/offer requested',
      leadId: sheet.leadId,
      metadata: { offerId: offer.id, costSheetId: data.costSheetId, reason: data.reason },
      createdById: data.requestedById,
    });
    await this.auditLogs.log('CREATE', 'Offer', offer.id, data.requestedById, { costSheetId: data.costSheetId });

    return this.serializable(offer);
  }

  async findAll(tenantId: string, query: { costSheetId?: string; leadId?: string; status?: string; page?: number; limit?: number }) {
    const { costSheetId, leadId, status, page = 1, limit = 20 } = query;
    const where: any = { tenantId };
    if (costSheetId) where.costSheetId = costSheetId;
    if (leadId) where.leadId = leadId;
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.prisma.offer.findMany({
        where,
        skip: (+page - 1) * +limit,
        take: +limit,
        orderBy: { createdAt: 'desc' },
        include: { approvals: true },
      }),
      this.prisma.offer.count({ where }),
    ]);
    return { data: data.map(o => this.serializable(o)), meta: { total, page: +page, limit: +limit } };
  }

  async findOne(tenantId: string, id: string) {
    const offer = await this.prisma.offer.findFirst({ where: { id, tenantId }, include: { approvals: true } });
    if (!offer) throw new NotFoundException('Offer not found');
    return this.serializable(offer);
  }

  /** Manager/owner only — enforced by @Roles. A rejected/expired offer can never be re-approved; a new one must be requested. */
  async decide(tenantId: string, id: string, decision: OfferDecision, reason: string | undefined, approverId?: string) {
    const offer = await this.prisma.offer.findFirst({ where: { id, tenantId } });
    if (!offer) throw new NotFoundException('Offer not found');
    if (offer.status !== OfferStatus.PENDING) {
      throw new ForbiddenException(`Offer is ${offer.status} and can no longer be decided`);
    }
    if (offer.expiresAt && offer.expiresAt < new Date()) {
      await this.prisma.offer.update({ where: { id }, data: { status: OfferStatus.EXPIRED } });
      throw new ForbiddenException('Offer has expired');
    }

    const status = decision === OfferDecision.APPROVED ? OfferStatus.APPROVED : OfferStatus.REJECTED;
    const [updated] = await this.prisma.$transaction([
      this.prisma.offer.update({ where: { id }, data: { status } }),
      this.prisma.offerApproval.create({ data: { offerId: id, approverId, decision, reason } }),
    ]);

    await this.timeline.add({
      type: decision === OfferDecision.APPROVED ? 'offer_approved' : 'offer_rejected',
      title: `Offer ${decision.toLowerCase()}`,
      leadId: offer.leadId,
      metadata: { offerId: id, reason },
      createdById: approverId,
    });
    await this.auditLogs.log(decision, 'Offer', id, approverId, { reason });

    return this.serializable(updated);
  }

  private serializable(offer: any) {
    return {
      ...offer,
      discountPaise: offer.discountPaise?.toString(),
      proposedValuePaise: offer.proposedValuePaise?.toString(),
      policyThresholdPaise: offer.policyThresholdPaise?.toString(),
    };
  }
}
