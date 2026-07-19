import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TimelineService } from '../timeline/timeline.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class RevenueShareService {
  constructor(
    private prisma: PrismaService,
    private timeline: TimelineService,
    private auditLogs: AuditLogsService,
  ) {}

  async createParty(tenantId: string, data: {
    projectId: string; partyName: string; partyType: string;
    sharePercent: number; contactEmail?: string; contactPhone?: string;
  }) {
    const project = await this.prisma.project.findFirst({ where: { id: data.projectId, tenantId } });
    if (!project) throw new NotFoundException('Project not found');

    const party = await this.prisma.revenueShareParty.create({
      data: {
        tenantId, projectId: data.projectId, partyName: data.partyName,
        partyType: data.partyType as any, sharePercent: data.sharePercent,
        contactEmail: data.contactEmail, contactPhone: data.contactPhone,
      },
    });
    await this.auditLogs.log('CREATE', 'RevenueShareParty', party.id, undefined, { after: party });
    return party;
  }

  async findAllParties(tenantId: string, projectId?: string) {
    const where: any = { tenantId };
    if (projectId) where.projectId = projectId;
    return this.prisma.revenueShareParty.findMany({
      where, orderBy: { createdAt: 'desc' },
      include: { project: { select: { id: true, name: true } }, _count: { select: { allocations: true } } },
    });
  }

  async findParty(tenantId: string, id: string) {
    const party = await this.prisma.revenueShareParty.findFirst({
      where: { id, tenantId },
      include: { project: true, allocations: { include: { unit: { select: { unitNumber: true, id: true } }, booking: { select: { bookingNumber: true, id: true, title: true } } } } },
    });
    if (!party) throw new NotFoundException('Revenue share party not found');
    return party;
  }

  async createAllocation(tenantId: string, data: {
    partyId: string; unitId?: string; bookingId?: string; allocatedAmountPaise?: string;
  }) {
    const party = await this.prisma.revenueShareParty.findFirst({ where: { id: data.partyId, tenantId } });
    if (!party) throw new NotFoundException('Revenue share party not found');
    if (!data.unitId && !data.bookingId) {
      throw new BadRequestException('Either unitId or bookingId must be provided');
    }

    const allocation = await this.prisma.revenueShareAllocation.create({
      data: {
        tenantId, partyId: data.partyId, unitId: data.unitId, bookingId: data.bookingId,
        allocatedAmountPaise: data.allocatedAmountPaise ? BigInt(data.allocatedAmountPaise) : null,
      },
    });

    if (data.bookingId) {
      const booking = await this.prisma.booking.findUnique({ where: { id: data.bookingId } });
      if (booking?.leadId) {
        await this.timeline.add({
          type: 'revenue_share_allocated', title: `Revenue share allocated to ${party.partyName}`,
          leadId: booking.leadId, metadata: { allocationId: allocation.id, partyId: data.partyId },
          createdById: undefined,
        });
      }
    }

    return allocation;
  }

  async updateAllocationStatus(tenantId: string, allocationId: string, status: string) {
    const allocation = await this.prisma.revenueShareAllocation.findFirst({
      where: { id: allocationId, party: { tenantId } },
    });
    if (!allocation) throw new NotFoundException('Allocation not found');

    const updated = await this.prisma.revenueShareAllocation.update({
      where: { id: allocationId }, data: { status: status as any },
    });
    await this.auditLogs.log('UPDATE', 'RevenueShareAllocation', allocationId, undefined, { before: allocation, after: updated });
    return updated;
  }

  async getSettlementReport(projectId: string, tenantId?: string) {
    if (tenantId) {
      const p = await this.prisma.project.findFirst({ where: { id: projectId, tenantId } });
      if (!p) throw new NotFoundException('Project not found');
    }

    const parties = await this.prisma.revenueShareParty.findMany({
      where: { projectId },
      include: { allocations: true },
    });

    const summary = parties.map(p => {
      const totalAllocated = p.allocations.reduce((s, a) => s + Number(a.allocatedAmountPaise || 0n), 0);
      const settled = p.allocations.filter(a => a.status === 'SETTLED').reduce((s, a) => s + Number(a.allocatedAmountPaise || 0n), 0);
      return {
        id: p.id, partyName: p.partyName, sharePercent: p.sharePercent,
        totalAllocatedPaise: BigInt(totalAllocated),
        settledPaise: BigInt(settled),
        pendingPaise: BigInt(totalAllocated - settled),
        status: settled >= totalAllocated ? 'SETTLED' : 'PENDING',
      };
    });

    return { projectId, totalParties: parties.length, parties: summary };
  }
}
