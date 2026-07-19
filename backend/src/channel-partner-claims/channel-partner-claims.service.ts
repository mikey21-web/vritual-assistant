import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NormalizationService } from '../shared/normalization.service';
import { TimelineService } from '../timeline/timeline.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { PartnerLeadClaimStatus, CommissionAccrualStatus } from '@prisma/client';

const LOCK_WINDOW_MS = 30 * 24 * 60 * 60 * 1000; // 30 days, per spec 23/48.12 "registration lock period"

@Injectable()
export class ChannelPartnerClaimsService {
  constructor(
    private prisma: PrismaService,
    private normalization: NormalizationService,
    private timeline: TimelineService,
    private auditLogs: AuditLogsService,
  ) {}

  /**
   * Duplicate-protection registration flow (spec 48.12): the response given
   * to the registering partner is always neutral — REGISTERED,
   * ALREADY_REGISTERED, or NEEDS_REVIEW — and never names another partner.
   */
  async registerClaim(tenantId: string, data: { channelPartnerId: string; phone: string; leadId?: string }) {
    const partner = await this.prisma.channelPartner.findFirst({ where: { id: data.channelPartnerId, tenantId } });
    if (!partner) throw new NotFoundException('Channel partner not found');

    const phone = this.normalization.normalizePhone(data.phone);
    const lockCutoff = new Date(Date.now() - LOCK_WINDOW_MS);

    const existing = await this.prisma.partnerLeadClaim.findFirst({
      where: { tenantId, phone, createdAt: { gte: lockCutoff }, status: { not: PartnerLeadClaimStatus.REJECTED } },
      orderBy: { createdAt: 'desc' },
    });

    if (existing) {
      const status = existing.channelPartnerId === data.channelPartnerId
        ? PartnerLeadClaimStatus.ALREADY_REGISTERED
        : PartnerLeadClaimStatus.NEEDS_REVIEW;

      const claim = await this.prisma.partnerLeadClaim.create({
        data: {
          tenantId,
          channelPartnerId: data.channelPartnerId,
          leadId: data.leadId,
          phone,
          status,
          lockUntil: new Date(Date.now() + LOCK_WINDOW_MS),
        },
      });

      if (status === PartnerLeadClaimStatus.NEEDS_REVIEW) {
        await this.timeline.add({
          type: 'partner_lead_claim_dispute',
          title: 'Partner lead claim needs review — possible duplicate',
          leadId: data.leadId,
          metadata: { claimId: claim.id },
        });
      }
      return claim;
    }

    const claim = await this.prisma.partnerLeadClaim.create({
      data: {
        tenantId,
        channelPartnerId: data.channelPartnerId,
        leadId: data.leadId,
        phone,
        status: PartnerLeadClaimStatus.REGISTERED,
        lockUntil: new Date(Date.now() + LOCK_WINDOW_MS),
      },
    });
    await this.auditLogs.log('REGISTER', 'PartnerLeadClaim', claim.id, undefined, { channelPartnerId: data.channelPartnerId });
    return claim;
  }

  async findAll(tenantId: string, query: { channelPartnerId?: string; status?: string; page?: number; limit?: number }) {
    const { channelPartnerId, status, page = 1, limit = 20 } = query;
    const where: any = { tenantId };
    if (channelPartnerId) where.channelPartnerId = channelPartnerId;
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.prisma.partnerLeadClaim.findMany({ where, skip: (+page - 1) * +limit, take: +limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.partnerLeadClaim.count({ where }),
    ]);
    return { data, meta: { total, page: +page, limit: +limit } };
  }

  /** Manager/owner only — enforced by @Roles. Produces an immutable decision record for a disputed claim. */
  async resolve(tenantId: string, id: string, decision: 'REGISTERED' | 'REJECTED', reason: string | undefined, decidedById?: string) {
    const claim = await this.prisma.partnerLeadClaim.findFirst({ where: { id, tenantId } });
    if (!claim) throw new NotFoundException('Partner lead claim not found');
    if (claim.status !== PartnerLeadClaimStatus.NEEDS_REVIEW) {
      throw new ForbiddenException(`Claim is ${claim.status} and does not need review`);
    }

    const updated = await this.prisma.partnerLeadClaim.update({
      where: { id },
      data: { status: decision, decidedById, decidedAt: new Date(), decisionReason: reason },
    });
    await this.auditLogs.log('RESOLVE', 'PartnerLeadClaim', id, decidedById, { decision, reason });
    return updated;
  }

  // ── Commission ────────────────────────────────────────────────────────────

  async createAccrual(tenantId: string, data: { channelPartnerId: string; bookingId?: string; planId?: string; amountPaise: number }) {
    const partner = await this.prisma.channelPartner.findFirst({ where: { id: data.channelPartnerId, tenantId } });
    if (!partner) throw new NotFoundException('Channel partner not found');

    const plan = data.planId ? await this.prisma.commissionPlan.findFirst({ where: { id: data.planId, tenantId } }) : null;

    return this.prisma.commissionAccrual.create({
      data: {
        tenantId,
        channelPartnerId: data.channelPartnerId,
        bookingId: data.bookingId,
        planId: data.planId,
        amountPaise: BigInt(data.amountPaise),
        policySnapshot: plan ? JSON.parse(JSON.stringify(plan, (_k, v) => (typeof v === 'bigint' ? v.toString() : v))) : {},
      },
    }).then(a => this.serializable(a));
  }

  async findAccruals(tenantId: string, query: { channelPartnerId?: string; status?: string; page?: number; limit?: number }) {
    const { channelPartnerId, status, page = 1, limit = 20 } = query;
    const where: any = { tenantId };
    if (channelPartnerId) where.channelPartnerId = channelPartnerId;
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.prisma.commissionAccrual.findMany({ where, skip: (+page - 1) * +limit, take: +limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.commissionAccrual.count({ where }),
    ]);
    return { data: data.map(a => this.serializable(a)), meta: { total, page: +page, limit: +limit } };
  }

  /** Manager/owner only. Finance still confirms actual payout separately via createPayout. */
  async approveAccrual(tenantId: string, id: string, approvedById?: string) {
    const accrual = await this.prisma.commissionAccrual.findFirst({ where: { id, tenantId } });
    if (!accrual) throw new NotFoundException('Commission accrual not found');
    if (accrual.status !== CommissionAccrualStatus.PENDING) {
      throw new ForbiddenException(`Accrual is ${accrual.status} and cannot be approved`);
    }
    const updated = await this.prisma.commissionAccrual.update({
      where: { id },
      data: { status: CommissionAccrualStatus.APPROVED, approvedById, approvedAt: new Date() },
    });
    return this.serializable(updated);
  }

  /** Bundles approved accruals into one payout and marks them PAID — finance-only action. */
  async createPayout(tenantId: string, channelPartnerId: string, accrualIds: string[], approvedById?: string) {
    const accruals = await this.prisma.commissionAccrual.findMany({
      where: { id: { in: accrualIds }, tenantId, channelPartnerId, status: CommissionAccrualStatus.APPROVED },
    });
    if (accruals.length !== accrualIds.length) {
      throw new ForbiddenException('One or more accruals are not APPROVED or do not belong to this partner');
    }
    const amountPaise = accruals.reduce((sum, a) => sum + a.amountPaise, BigInt(0));

    const payout = await this.prisma.$transaction(async (tx) => {
      const p = await tx.commissionPayout.create({
        data: { tenantId, channelPartnerId, amountPaise, approvedById },
      });
      await tx.commissionAccrual.updateMany({
        where: { id: { in: accrualIds } },
        data: { status: CommissionAccrualStatus.PAID, payoutId: p.id },
      });
      return p;
    });

    return { ...payout, amountPaise: payout.amountPaise.toString() };
  }

  /** Leaderboard: leads registered, disputes, and commission earned/paid per partner — spec 48.12 "partner performance dashboard". */
  async getPerformance(tenantId: string) {
    const partners = await this.prisma.channelPartner.findMany({ where: { tenantId }, select: { id: true, name: true, status: true } });

    const [claims, accruals] = await Promise.all([
      this.prisma.partnerLeadClaim.findMany({ where: { tenantId }, select: { channelPartnerId: true, status: true } }),
      this.prisma.commissionAccrual.findMany({ where: { tenantId }, select: { channelPartnerId: true, status: true, amountPaise: true } }),
    ]);

    return partners.map(p => {
      const partnerClaims = claims.filter(c => c.channelPartnerId === p.id);
      const partnerAccruals = accruals.filter(a => a.channelPartnerId === p.id);
      const earned = partnerAccruals.reduce((sum, a) => sum + a.amountPaise, BigInt(0));
      const paid = partnerAccruals.filter(a => a.status === CommissionAccrualStatus.PAID).reduce((sum, a) => sum + a.amountPaise, BigInt(0));

      return {
        channelPartnerId: p.id,
        name: p.name,
        status: p.status,
        leadsRegistered: partnerClaims.length,
        disputedClaims: partnerClaims.filter(c => c.status === PartnerLeadClaimStatus.NEEDS_REVIEW).length,
        bookingsWithCommission: partnerAccruals.length,
        commissionEarnedPaise: earned.toString(),
        commissionPaidPaise: paid.toString(),
      };
    }).sort((a, b) => Number(BigInt(b.commissionEarnedPaise) - BigInt(a.commissionEarnedPaise)));
  }

  private serializable(accrual: any) {
    return { ...accrual, amountPaise: accrual.amountPaise?.toString() };
  }
}
