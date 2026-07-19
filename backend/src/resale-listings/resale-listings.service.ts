import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class ResaleListingsService {
  constructor(
    private prisma: PrismaService,
    private auditLogs: AuditLogsService,
  ) {}

  async createListing(tenantId: string, data: {
    listingType: string; unitId?: string; externalOwnerName?: string;
    askingPriceRupees?: number; rentAmountRupees?: number;
    location?: string; bedrooms?: number; areaSqft?: number;
    createdById?: string;
  }) {
    const listing = await this.prisma.resaleListing.create({
      data: {
        tenantId, listingType: data.listingType as any, unitId: data.unitId,
        externalOwnerName: data.externalOwnerName,
        askingPriceRupees: data.askingPriceRupees, rentAmountRupees: data.rentAmountRupees,
        location: data.location, bedrooms: data.bedrooms, areaSqft: data.areaSqft,
        createdById: data.createdById,
      },
    });
    await this.auditLogs.log('CREATE', 'ResaleListing', listing.id, data.createdById, { after: listing });
    return listing;
  }

  async findAll(tenantId: string, filters?: {
    listingType?: string; status?: string; location?: string;
    minPrice?: number; maxPrice?: number; bedrooms?: number;
  }) {
    const where: any = { tenantId };
    if (filters?.listingType) where.listingType = filters.listingType;
    if (filters?.status) where.status = filters.status;
    if (filters?.location) where.location = { contains: filters.location, mode: 'insensitive' };
    if (filters?.bedrooms) where.bedrooms = filters.bedrooms;
    if (filters?.minPrice || filters?.maxPrice) {
      where.askingPriceRupees = {};
      if (filters.minPrice) where.askingPriceRupees.gte = filters.minPrice;
      if (filters.maxPrice) where.askingPriceRupees.lte = filters.maxPrice;
    }

    return this.prisma.resaleListing.findMany({
      where, orderBy: { createdAt: 'desc' },
      include: { unit: { include: { project: { select: { id: true, name: true } }, tower: { select: { name: true } } } } },
    });
  }

  async findOne(tenantId: string, id: string) {
    const listing = await this.prisma.resaleListing.findFirst({
      where: { id, tenantId },
      include: { unit: { include: { project: true, tower: true } } },
    });
    if (!listing) throw new NotFoundException('Listing not found');
    return listing;
  }

  async updateStatus(tenantId: string, id: string, status: string) {
    const listing = await this.prisma.resaleListing.findFirst({ where: { id, tenantId } });
    if (!listing) throw new NotFoundException('Listing not found');

    const updated = await this.prisma.resaleListing.update({
      where: { id }, data: { status: status as any },
    });
    await this.auditLogs.log('UPDATE', 'ResaleListing', id, undefined, { before: listing, after: updated });
    return updated;
  }

  async getMarketInsights(tenantId: string, location?: string) {
    const where: any = { tenantId, status: 'AVAILABLE' };
    if (location) where.location = { contains: location, mode: 'insensitive' };

    const listings = await this.prisma.resaleListing.findMany({ where });
    const prices = listings.filter(l => l.askingPriceRupees).map(l => l.askingPriceRupees!);
    const rents = listings.filter(l => l.rentAmountRupees).map(l => l.rentAmountRupees!);

    return {
      totalActive: listings.length,
      avgPriceRupees: prices.length > 0 ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0,
      minPriceRupees: prices.length > 0 ? Math.min(...prices) : 0,
      maxPriceRupees: prices.length > 0 ? Math.max(...prices) : 0,
      avgRentRupees: rents.length > 0 ? Math.round(rents.reduce((a, b) => a + b, 0) / rents.length) : 0,
    };
  }
}
