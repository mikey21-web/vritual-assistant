import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { EventsService } from '../events/events.service';
import { ApprovalRequestStatus } from '@prisma/client';

/**
 * Generic approval object (spec 46.5) for one-off approval needs that don't
 * already have their own dedicated flow — Offer and CostSheet keep their
 * existing, already-tested approval paths rather than being retrofitted onto
 * this model. New approval-gated actions (booking cancellation, price
 * override, payment waiver, exceptional hold extension) should create one of
 * these instead of inventing another ad hoc status field.
 */
const ROLE_RANK: Record<string, number> = {
  OWNER: 0, ADMIN: 1, MANAGER: 2, SALES_AGENT: 3, SUPPORT_AGENT: 4, VIEWER: 5,
};

@Injectable()
export class ApprovalsService {
  constructor(
    private prisma: PrismaService,
    private auditLogs: AuditLogsService,
    private events: EventsService,
  ) {}

  /** Highest-threshold active policy for this type whose minAmountPaise <= amount; null amount matches only policies with no minimum. */
  private async findApplicablePolicy(tenantId: string, type: string, amountPaise?: number) {
    const policies = await this.prisma.approvalPolicy.findMany({
      where: { tenantId, type, active: true },
      orderBy: { minAmountPaise: 'desc' },
    });
    const amount = amountPaise != null ? BigInt(amountPaise) : null;
    return policies.find(p => p.minAmountPaise == null || (amount != null && amount >= p.minAmountPaise)) || null;
  }

  async createPolicy(tenantId: string, data: { type: string; minAmountPaise?: number; requiredRole: string }) {
    return this.prisma.approvalPolicy.create({
      data: {
        tenantId,
        type: data.type,
        minAmountPaise: data.minAmountPaise != null ? BigInt(data.minAmountPaise) : undefined,
        requiredRole: data.requiredRole as any,
      },
    }).then(p => this.serializable(p));
  }

  async listPolicies(tenantId: string) {
    const rows = await this.prisma.approvalPolicy.findMany({ where: { tenantId }, orderBy: [{ type: 'asc' }, { minAmountPaise: 'desc' }] });
    return rows.map(p => this.serializable(p));
  }

  async setPolicyActive(tenantId: string, id: string, active: boolean) {
    const policy = await this.prisma.approvalPolicy.findFirst({ where: { id, tenantId } });
    if (!policy) throw new NotFoundException('Approval policy not found');
    return this.prisma.approvalPolicy.update({ where: { id }, data: { active } }).then(p => this.serializable(p));
  }

  async request(tenantId: string, data: {
    type: string;
    entityType: string;
    entityId: string;
    amountPaise?: number;
    reason?: string;
    expiresAt?: Date;
    requestedById?: string;
  }) {
    const policy = await this.findApplicablePolicy(tenantId, data.type, data.amountPaise);
    return this.prisma.approvalRequest.create({
      data: {
        tenantId,
        type: data.type,
        entityType: data.entityType,
        entityId: data.entityId,
        amountPaise: data.amountPaise != null ? BigInt(data.amountPaise) : undefined,
        reason: data.reason,
        expiresAt: data.expiresAt,
        requestedById: data.requestedById,
        policySnapshot: policy
          ? { requiredRole: policy.requiredRole, minAmountPaise: policy.minAmountPaise?.toString(), policyId: policy.id }
          : {},
      },
    }).then(a => this.serializable(a));
  }

  async findAll(tenantId: string, query: { status?: string; type?: string; entityType?: string }) {
    const where: any = { tenantId };
    if (query.status) where.status = query.status;
    if (query.type) where.type = query.type;
    if (query.entityType) where.entityType = query.entityType;
    const rows = await this.prisma.approvalRequest.findMany({ where, orderBy: { createdAt: 'desc' } });
    return rows.map(r => this.serializable(r));
  }

  async decide(tenantId: string, id: string, decision: 'APPROVED' | 'REJECTED', reason: string | undefined, approvedById: string | undefined, approverRole: string) {
    const request = await this.prisma.approvalRequest.findFirst({ where: { id, tenantId } });
    if (!request) throw new NotFoundException('Approval request not found');
    if (request.status !== ApprovalRequestStatus.PENDING) {
      throw new ForbiddenException(`Approval request is ${request.status} and cannot be decided`);
    }
    if (request.expiresAt && request.expiresAt < new Date()) {
      await this.prisma.approvalRequest.update({ where: { id }, data: { status: ApprovalRequestStatus.EXPIRED } });
      throw new ForbiddenException('Approval request has expired');
    }
    const requiredRole = (request.policySnapshot as any)?.requiredRole;
    if (requiredRole && (ROLE_RANK[approverRole] ?? 99) > (ROLE_RANK[requiredRole] ?? 0)) {
      throw new ForbiddenException(`This approval requires ${requiredRole} or higher`);
    }

    const updated = await this.prisma.approvalRequest.update({
      where: { id },
      data: { status: decision, approvedById, decidedAt: new Date(), reason: reason || request.reason },
    });
    await this.auditLogs.log(decision, 'ApprovalRequest', id, approvedById, { reason });
    this.events.emit({ type: `mikey.approval.${decision.toLowerCase()}`, source: 'approvals', entityType: request.entityType || undefined, entityId: request.entityId || undefined, payload: { approvalId: id, requestType: request.type, reason, previousType: request.type } });
    return this.serializable(updated);
  }

  private serializable(request: any) {
    return { ...request, amountPaise: request.amountPaise?.toString() };
  }
}
