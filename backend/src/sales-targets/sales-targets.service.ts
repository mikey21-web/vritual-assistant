import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SalesTargetsService {
  constructor(private prisma: PrismaService) {}

  createTarget(tenantId: string, data: {
    scope: string; projectId?: string; userId?: string; metric: string;
    periodStart: string; periodEnd: string; targetValue: number; createdById?: string;
  }) {
    return this.prisma.salesTarget.create({
      data: {
        tenantId, scope: data.scope as any, projectId: data.projectId, userId: data.userId,
        metric: data.metric as any, periodStart: new Date(data.periodStart), periodEnd: new Date(data.periodEnd),
        targetValue: data.targetValue, createdById: data.createdById,
      },
    });
  }

  listTargets(tenantId: string, filters?: { projectId?: string; userId?: string; scope?: string }) {
    const where: any = { tenantId };
    if (filters?.projectId) where.projectId = filters.projectId;
    if (filters?.userId) where.userId = filters.userId;
    if (filters?.scope) where.scope = filters.scope;
    return this.prisma.salesTarget.findMany({ where, orderBy: { periodStart: 'desc' } });
  }

  async getProgress(tenantId: string, targetId: string) {
    const target = await this.prisma.salesTarget.findFirst({ where: { id: targetId, tenantId } });
    if (!target) throw new NotFoundException('Sales target not found');

    const actualValue = await this.computeActual(tenantId, target);
    return {
      target,
      actualValue,
      percentComplete: target.targetValue > 0 ? Math.round((actualValue / target.targetValue) * 1000) / 10 : 0,
    };
  }

  private async computeActual(tenantId: string, target: { metric: string; projectId: string | null; userId: string | null; periodStart: Date; periodEnd: Date }) {
    const period = { gte: target.periodStart, lte: target.periodEnd };
    const projectFilter = target.projectId ? { unit: { projectId: target.projectId } } : {};
    const leadFilter = target.userId ? { lead: { assignedAgentId: target.userId } } : {};

    switch (target.metric) {
      case 'BOOKINGS':
        return this.prisma.booking.count({
          where: { tenantId, confirmedAt: period, ...projectFilter, ...leadFilter },
        });
      case 'SITE_VISITS':
        return this.prisma.siteVisit.count({
          where: {
            tenantId, startAt: period,
            ...(target.projectId ? { projectId: target.projectId } : {}),
            ...(target.userId ? { assignedAgentId: target.userId } : {}),
          },
        });
      case 'AGREEMENT_VALUE_PAISE': {
        const agg = await this.prisma.booking.aggregate({
          where: { tenantId, confirmedAt: period, ...projectFilter, ...leadFilter },
          _sum: { bookingAmountPaise: true },
        });
        return Number(agg._sum.bookingAmountPaise ?? 0n);
      }
      case 'COLLECTIONS_PAISE': {
        const agg = await this.prisma.paymentReceipt.aggregate({
          where: {
            tenantId, status: 'CONFIRMED', receivedAt: period,
            ...(target.projectId ? { booking: { unit: { projectId: target.projectId } } } : {}),
            ...(target.userId ? { lead: { assignedAgentId: target.userId } } : {}),
          },
          _sum: { amountPaise: true },
        });
        return Number(agg._sum.amountPaise ?? 0n);
      }
      case 'LEAD_RESPONSE': {
        const where: any = {
          tenantId, createdAt: period,
          ...(target.userId ? { assignedAgentId: target.userId } : {}),
        };
        const [total, responded] = await Promise.all([
          this.prisma.lead.count({ where }),
          this.prisma.lead.count({ where: { ...where, status: { notIn: ['NEW'] } } }),
        ]);
        return total > 0 ? Math.round((responded / total) * 100) : 0;
      }
      default:
        return 0;
    }
  }
}
