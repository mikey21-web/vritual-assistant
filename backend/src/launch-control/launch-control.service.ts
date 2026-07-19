import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Read-only launch-day control room (spec 63.3) — aggregates existing data
 * (leads, SLA breaches, site visits, checkout activity, inventory releases,
 * connector health) into one live view. No new mutating models; every number
 * links back to a real, queryable record.
 */
@Injectable()
export class LaunchControlService {
  constructor(private prisma: PrismaService) {}

  async getStatus(tenantId: string, projectId?: string) {
    const since15Min = new Date(Date.now() - 15 * 60 * 1000);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      newLeadsLast15Min,
      openSlaBreaches,
      agentsAvailable,
      agentsTotal,
      visitsToday,
      checkoutHoldsActive,
      paymentsPending,
      unitsReleasedToday,
      unitsBookedToday,
      recentIntegrationFailures,
      plannedReleaseBatches,
    ] = await Promise.all([
      this.prisma.lead.count({ where: { tenantId, createdAt: { gte: since15Min } } }),
      this.prisma.slaBreach.count({ where: { tenantId, resolvedAt: null } }),
      this.prisma.agentAvailability.count({ where: { tenantId, status: 'AVAILABLE' } }),
      this.prisma.agentAvailability.count({ where: { tenantId } }),
      this.prisma.siteVisit.count({
        where: { tenantId, startAt: { gte: todayStart }, ...(projectId ? { projectId } : {}) },
      }),
      this.prisma.checkoutHold.count({ where: { tenantId, status: 'ACTIVE', expiresAt: { gt: new Date() } } }),
      this.prisma.paymentIntent.count({ where: { tenantId, status: 'PENDING' } }),
      this.prisma.unitStatusHistory.count({
        where: { changedAt: { gte: todayStart }, toStatus: 'AVAILABLE', unit: { tenantId, ...(projectId ? { projectId } : {}) } },
      }),
      this.prisma.unitStatusHistory.count({
        where: { changedAt: { gte: todayStart }, toStatus: 'BOOKED', unit: { tenantId, ...(projectId ? { projectId } : {}) } },
      }),
      this.prisma.integrationEvent.count({ where: { tenantId, status: 'FAILED', createdAt: { gte: todayStart } } }),
      this.prisma.inventoryReleaseBatch.findMany({
        where: { tenantId, status: 'PLANNED', ...(projectId ? { projectId } : {}) },
        orderBy: { releaseAt: 'asc' },
        take: 5,
      }),
    ]);

    return {
      newLeadsLast15Min,
      openSlaBreaches,
      agentsAvailable,
      agentsTotal,
      visitsToday,
      checkoutHoldsActive,
      paymentsPending,
      unitsReleasedToday,
      unitsBookedToday,
      recentIntegrationFailures,
      upcomingReleaseBatches: plannedReleaseBatches,
    };
  }
}
