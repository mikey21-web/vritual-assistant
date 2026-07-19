import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class AlliedInventoryService {
  constructor(
    private prisma: PrismaService,
    private auditLogs: AuditLogsService,
  ) {}

  createPhase(tenantId: string, data: { projectId: string; name: string }) {
    return this.prisma.projectPhase.create({ data: { tenantId, projectId: data.projectId, name: data.name } });
  }

  listPhases(tenantId: string, projectId?: string) {
    return this.prisma.projectPhase.findMany({ where: { tenantId, ...(projectId ? { projectId } : {}) }, orderBy: { createdAt: 'asc' } });
  }

  createItem(tenantId: string, data: { projectId: string; towerId?: string; type: string; label: string; priceRupees?: number }) {
    return this.prisma.alliedInventoryItem.create({
      data: { tenantId, projectId: data.projectId, towerId: data.towerId, type: data.type as any, label: data.label, priceRupees: data.priceRupees },
    });
  }

  listItems(tenantId: string, filters?: { projectId?: string; towerId?: string; type?: string; status?: string }) {
    const where: any = { tenantId };
    if (filters?.projectId) where.projectId = filters.projectId;
    if (filters?.towerId) where.towerId = filters.towerId;
    if (filters?.type) where.type = filters.type;
    if (filters?.status) where.status = filters.status;
    return this.prisma.alliedInventoryItem.findMany({ where, orderBy: { createdAt: 'desc' } });
  }

  async allocateItem(tenantId: string, itemId: string, bookingId: string, actorId?: string, pricePaidPaise?: bigint) {
    const item = await this.prisma.alliedInventoryItem.findFirst({ where: { id: itemId, tenantId } });
    if (!item) throw new NotFoundException('Allied inventory item not found');
    if (item.status !== 'AVAILABLE') throw new ForbiddenException(`Item is ${item.status}, not available`);
    const booking = await this.prisma.booking.findFirst({ where: { id: bookingId, tenantId } });
    if (!booking) throw new NotFoundException('Booking not found');

    const [, allocation] = await this.prisma.$transaction([
      this.prisma.alliedInventoryItem.update({ where: { id: itemId }, data: { status: 'ALLOCATED' } }),
      this.prisma.alliedInventoryAllocation.create({
        data: { tenantId, itemId, bookingId, pricePaidPaise },
      }),
    ]);
    await this.auditLogs.log('ALLOCATE', 'AlliedInventoryItem', itemId, actorId, { bookingId });
    return allocation;
  }

  async releaseAllocation(tenantId: string, allocationId: string, actorId?: string) {
    const allocation = await this.prisma.alliedInventoryAllocation.findFirst({ where: { id: allocationId, tenantId } });
    if (!allocation) throw new NotFoundException('Allocation not found');

    await this.prisma.$transaction([
      this.prisma.alliedInventoryAllocation.delete({ where: { id: allocationId } }),
      this.prisma.alliedInventoryItem.update({ where: { id: allocation.itemId }, data: { status: 'AVAILABLE' } }),
    ]);
    await this.auditLogs.log('RELEASE', 'AlliedInventoryItem', allocation.itemId, actorId, {});
    return { released: true };
  }

  createReleaseBatch(tenantId: string, data: { projectId: string; phaseId?: string; name: string; unitIds: string[]; releaseAt: string; createdById?: string }) {
    return this.prisma.inventoryReleaseBatch.create({
      data: {
        tenantId, projectId: data.projectId, phaseId: data.phaseId, name: data.name,
        unitIds: data.unitIds, releaseAt: new Date(data.releaseAt), createdById: data.createdById,
      },
    });
  }

  listReleaseBatches(tenantId: string, projectId?: string) {
    return this.prisma.inventoryReleaseBatch.findMany({ where: { tenantId, ...(projectId ? { projectId } : {}) }, orderBy: { releaseAt: 'desc' } });
  }

  async approveReleaseBatch(tenantId: string, batchId: string, approvedById: string) {
    const batch = await this.prisma.inventoryReleaseBatch.findFirst({ where: { id: batchId, tenantId } });
    if (!batch) throw new NotFoundException('Release batch not found');
    if (batch.status !== 'PLANNED') throw new ForbiddenException(`Batch is ${batch.status}, not PLANNED`);

    const updated = await this.prisma.inventoryReleaseBatch.update({
      where: { id: batchId },
      data: { status: 'RELEASED', releasedAt: new Date(), approvedById },
    });
    await this.auditLogs.log('RELEASE_BATCH', 'InventoryReleaseBatch', batchId, approvedById, { unitCount: batch.unitIds.length });
    return updated;
  }
}
