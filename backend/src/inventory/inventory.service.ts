import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  // --- Items ---
  findItems(query: any = {}) {
    const { category, page = 1, limit = 20 } = query;
    const where: any = {};
    if (category) where.category = category;
    return Promise.all([
      this.prisma.inventoryItem.findMany({ where, skip: (+page - 1) * +limit, take: +limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.inventoryItem.count({ where }),
    ]).then(([data, total]) => ({ data, meta: { total, page: +page, limit: +limit } }));
  }

  async stats() {
    const items = await this.prisma.inventoryItem.findMany();
    return {
      totalItems: items.length,
      lowStock: items.filter(i => i.quantity <= i.minStock && i.quantity > 0).length,
      outOfStock: items.filter(i => i.quantity <= 0).length,
      totalValue: 0, // no unitValue field captured yet; left for a future pass alongside purchase-history parsing
    };
  }

  createItem(data: any) { return this.prisma.inventoryItem.create({ data }); }

  async findItem(id: string) {
    const item = await this.prisma.inventoryItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Inventory item not found');
    return item;
  }

  // --- Stock movements (audit trail; RECEIVED/SHIPPED/ADJUSTMENT change item.quantity, TRANSFER changes location) ---
  findMovements(query: any = {}) {
    const { itemId, page = 1, limit = 20 } = query;
    const where: any = {};
    if (itemId) where.itemId = itemId;
    return Promise.all([
      this.prisma.stockMovement.findMany({ where, skip: (+page - 1) * +limit, take: +limit, orderBy: { date: 'desc' }, include: { item: { select: { id: true, name: true } } } }),
      this.prisma.stockMovement.count({ where }),
    ]).then(([data, total]) => ({ data, meta: { total, page: +page, limit: +limit } }));
  }

  async createMovement(data: any) {
    const item = await this.findItem(data.itemId);
    let quantity = item.quantity;
    if (data.type === 'RECEIVED' || data.type === 'ADJUSTMENT') quantity += data.qty;
    else if (data.type === 'SHIPPED') quantity -= data.qty;

    const [movement] = await this.prisma.$transaction([
      this.prisma.stockMovement.create({ data }),
      this.prisma.inventoryItem.update({ where: { id: data.itemId }, data: { quantity, locationId: data.type === 'TRANSFER' ? data.toLocationId : item.locationId } }),
    ]);
    return movement;
  }

  // --- Locations (nestable) ---
  findLocations(query: any = {}) {
    return this.prisma.inventoryLocation.findMany({ where: query.active !== undefined ? { active: query.active === 'true' } : {}, orderBy: { name: 'asc' } });
  }
  createLocation(data: any) { return this.prisma.inventoryLocation.create({ data }); }

  // --- Allocation to events, governed by Advisory/Strict enforcement ---
  private async getEnforcementMode(): Promise<'ADVISORY' | 'STRICT'> {
    const settings = await this.prisma.businessSettings.findFirst({ where: { singleton: true } });
    return (settings?.inventoryEnforcement as 'ADVISORY' | 'STRICT') || 'ADVISORY';
  }

  async allocateToEvent(eventId: string, data: any) {
    const item = await this.findItem(data.itemId);
    const existingAllocations = await this.prisma.inventoryAllocation.aggregate({ where: { itemId: data.itemId }, _sum: { qtyAllocated: true } });
    const alreadyAllocated = existingAllocations._sum.qtyAllocated || 0;
    const available = item.quantity - alreadyAllocated;

    if (data.qtyAllocated > available) {
      const mode = await this.getEnforcementMode();
      if (mode === 'STRICT') {
        throw new BadRequestException(`Cannot allocate ${data.qtyAllocated} of "${item.name}" — only ${available} available and strict enforcement is on.`);
      }
      // Advisory mode: allocation proceeds, shortage is visible via listAllocations for follow-up.
    }

    return this.prisma.inventoryAllocation.create({ data: { eventId, itemId: data.itemId, qtyAllocated: data.qtyAllocated, tenantId: item.tenantId } });
  }

  listAllocations(eventId: string) {
    return this.prisma.inventoryAllocation.findMany({ where: { eventId }, include: { item: { select: { id: true, name: true, quantity: true } } } });
  }
}
