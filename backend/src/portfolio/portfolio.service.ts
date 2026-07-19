import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PortfolioService {
  constructor(private prisma: PrismaService) {}

  async getOverview(tenantId: string) {
    const [projects, activeProjects, totalUnits, soldUnits, totalInventory, totalLeads, totalBookings, totalCollections] =
      await Promise.all([
        this.prisma.project.count({ where: { tenantId } }),
        this.prisma.project.count({ where: { tenantId, status: 'ACTIVE' as any } }),
        this.prisma.unit.count({ where: { project: { tenantId } } }),
        this.prisma.unit.count({ where: { project: { tenantId }, status: 'SOLD' as any } }),
        this.prisma.unit.count({ where: { project: { tenantId }, status: { in: ['AVAILABLE', 'READY_TO_MOVE'] as any } } }),
        this.prisma.lead.count({ where: { tenantId, deletedAt: null } }),
        this.prisma.booking.count({ where: { lead: { tenantId }, status: 'CONFIRMED' as any } }),
        this.prisma.paymentReceipt.aggregate({ where: { tenantId }, _sum: { amountPaise: true } }),
      ]);

    return {
      totalProjects: projects, activeProjects, totalUnits, soldUnits, totalInventory,
      pipeline: { leads: totalLeads, bookings: totalBookings },
      totalCollectionsPaise: totalCollections._sum.amountPaise || BigInt(0),
    };
  }

  async getEntitySummary(tenantId: string, entityType: string, entityId?: string) {
    if (entityType === 'project' && entityId) {
      return this.getProjectDetail(tenantId, entityId);
    }
    const projects = await this.prisma.project.findMany({
      where: { tenantId },
      include: { _count: { select: { units: true, towers: true } } },
    });
    return projects.map(p => ({
      id: p.id, name: p.name, status: p.status,
      totalUnits: p._count.units, totalTowers: p._count.towers,
    }));
  }

  private async getProjectDetail(tenantId: string, projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, tenantId },
      include: {
        towers: { include: { _count: { select: { units: true } } } },
        _count: { select: { units: true } },
      },
    });
    if (!project) return null;

    const [soldUnits, inventoryByStatus, recentTransactions] = await Promise.all([
      this.prisma.unit.count({ where: { projectId, status: 'SOLD' as any } }),
      this.prisma.unit.groupBy({ by: ['status'], where: { projectId }, _count: true }),
      this.prisma.paymentReceipt.findMany({
        where: { booking: { unit: { projectId } } },
        orderBy: { receivedAt: 'desc' }, take: 10,
        include: { booking: { select: { title: true, bookingNumber: true, id: true } } },
      }),
    ]);

    // Compute total area
    const areaAgg = await this.prisma.unit.aggregate({ where: { projectId }, _sum: { areaSqft: true } });

    return {
      ...project,
      soldUnits,
      totalAreaSqft: areaAgg._sum.areaSqft,
      inventoryByStatus,
      recentTransactions,
    };
  }

  async getCashPosition(tenantId: string) {
    const [totalCollected, totalDue, outstandingSchedules] = await Promise.all([
      this.prisma.paymentReceipt.aggregate({ where: { tenantId }, _sum: { amountPaise: true } }),
      this.prisma.paymentSchedule.aggregate({
        where: { tenantId, status: { in: ['PENDING', 'OVERDUE'] as any } },
        _sum: { amount: true },
      }),
      this.prisma.paymentSchedule.count({
        where: { tenantId, status: { in: ['PENDING', 'OVERDUE'] as any } },
      }),
    ]);

    return {
      totalCollectedPaise: totalCollected._sum.amountPaise || BigInt(0),
      totalDuePaise: BigInt(Math.round((totalDue._sum.amount || 0) * 100)), // amount is Float (rupees), convert to paise
      outstandingSchedules,
    };
  }
}
