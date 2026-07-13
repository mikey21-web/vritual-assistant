import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProcurementService {
  constructor(private prisma: PrismaService) {}

  // --- Partners ---
  findPartners(query: any = {}) {
    const { type, page = 1, limit = 20 } = query;
    const where: any = {};
    if (type) where.type = type;
    return Promise.all([
      this.prisma.partner.findMany({ where, skip: (+page - 1) * +limit, take: +limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.partner.count({ where }),
    ]).then(([data, total]) => ({ data, meta: { total, page: +page, limit: +limit } }));
  }
  createPartner(data: any) { return this.prisma.partner.create({ data }); }

  // --- Vendor Bookings ---
  findVendorBookings(query: any = {}) {
    const { status, eventId, page = 1, limit = 20 } = query;
    const where: any = {};
    if (status) where.status = status;
    if (eventId) where.eventId = eventId;
    return Promise.all([
      this.prisma.vendorBooking.findMany({ where, skip: (+page - 1) * +limit, take: +limit, orderBy: { createdAt: 'desc' }, include: { partner: { select: { id: true, name: true } } } }),
      this.prisma.vendorBooking.count({ where }),
    ]).then(([data, total]) => ({ data, meta: { total, page: +page, limit: +limit } }));
  }

  async findVendorBooking(id: string) {
    const b = await this.prisma.vendorBooking.findUnique({ where: { id }, include: { partner: true, event: true } });
    if (!b) throw new NotFoundException('Vendor booking not found');
    return b;
  }

  createVendorBooking(data: any) { return this.prisma.vendorBooking.create({ data }); }
  async updateVendorBooking(id: string, data: any) { await this.findVendorBooking(id); return this.prisma.vendorBooking.update({ where: { id }, data }); }

  // --- Purchase Orders (materials/goods from suppliers — distinct from Vendor Bookings) ---
  findPurchaseOrders(query: any = {}) {
    const { status, eventId, page = 1, limit = 20 } = query;
    const where: any = {};
    if (status) where.status = status;
    if (eventId) where.eventId = eventId;
    return Promise.all([
      this.prisma.purchaseOrder.findMany({ where, skip: (+page - 1) * +limit, take: +limit, orderBy: { createdAt: 'desc' }, include: { lineItems: true, partner: { select: { id: true, name: true } } } }),
      this.prisma.purchaseOrder.count({ where }),
    ]).then(([data, total]) => ({ data, meta: { total, page: +page, limit: +limit } }));
  }

  async findPurchaseOrder(id: string) {
    const po = await this.prisma.purchaseOrder.findUnique({ where: { id }, include: { lineItems: true, partner: true } });
    if (!po) throw new NotFoundException('Purchase order not found');
    return po;
  }

  createPurchaseOrder(data: any) {
    const { lineItems = [], ...rest } = data;
    const items = lineItems.map((li: any) => ({ description: li.description, qty: li.qty ?? 1, unitCost: li.unitCost, total: (li.qty ?? 1) * li.unitCost }));
    const totalValue = items.reduce((s: number, li: any) => s + li.total, 0);
    return this.prisma.purchaseOrder.create({ data: { ...rest, totalValue, lineItems: { create: items } }, include: { lineItems: true } });
  }

  async updatePurchaseOrder(id: string, data: any) { await this.findPurchaseOrder(id); return this.prisma.purchaseOrder.update({ where: { id }, data }); }
}
