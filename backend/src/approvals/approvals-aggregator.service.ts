import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface PendingApprovalItem {
  id: string;
  type: string;
  summary: string;
  amountPaise?: string;
  requestedAt: Date;
  link: { module: string; id: string };
}

/**
 * One screen's worth of "what needs my approval right now" (spec 56.5's
 * Approvals tab), reading each already-tested module's own pending state
 * instead of forcing everything through the generic ApprovalRequest model.
 */
@Injectable()
export class ApprovalsAggregatorService {
  constructor(private prisma: PrismaService) {}

  async findPending(tenantId: string): Promise<PendingApprovalItem[]> {
    const [offers, costSheets, approvalRequests] = await Promise.all([
      this.prisma.offer.findMany({
        where: { tenantId, status: 'PENDING' },
        include: { costSheet: { select: { unitId: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.costSheet.findMany({
        where: { tenantId, status: 'PENDING_APPROVAL' },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.approvalRequest.findMany({
        where: { tenantId, status: 'PENDING' },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const items: PendingApprovalItem[] = [];

    for (const o of offers) {
      items.push({
        id: `offer:${o.id}`,
        type: 'DISCOUNT_OFFER',
        summary: o.discountPaise ? `Discount request: ${o.reason || 'no reason given'}` : 'Discount request',
        amountPaise: o.discountPaise?.toString(),
        requestedAt: o.createdAt,
        link: { module: 'offers', id: o.id },
      });
    }
    for (const c of costSheets) {
      items.push({
        id: `cost-sheet:${c.id}`,
        type: 'COST_SHEET',
        summary: `Cost sheet awaiting approval (${c.totalPaise.toString()} paise)`,
        amountPaise: c.totalPaise.toString(),
        requestedAt: c.createdAt,
        link: { module: 'cost-sheets', id: c.id },
      });
    }
    for (const a of approvalRequests) {
      items.push({
        id: `approval:${a.id}`,
        type: a.type,
        summary: a.reason || `${a.type} approval for ${a.entityType}`,
        amountPaise: a.amountPaise?.toString(),
        requestedAt: a.createdAt,
        link: { module: 'approvals', id: a.id },
      });
    }

    return items.sort((a, b) => b.requestedAt.getTime() - a.requestedAt.getTime());
  }
}
