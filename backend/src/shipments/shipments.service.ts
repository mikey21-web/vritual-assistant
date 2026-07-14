import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, ShipmentStatus, ShipmentType, CargoType } from '@prisma/client';

@Injectable()
export class ShipmentsService {
  private readonly logger = new Logger(ShipmentsService.name);

  constructor(private prisma: PrismaService) {}

  async calculateQuote(dto: { origin: string; destination: string; weight: number; shipmentType?: string; cargoType?: string }) {
    const distanceCategory = this.estimateDistanceCategory(dto.origin, dto.destination);
    const rates = this.getRateCard(dto.shipmentType || 'FTL', distanceCategory);
    const hazardousMultiplier = dto.cargoType === 'HAZARDOUS' ? 1.5 : 1;
    const baseRate = rates.baseRate;
    const perKgRate = rates.perKgRate;
    const total = (baseRate + perKgRate * dto.weight) * hazardousMultiplier;

    return {
      baseRate,
      perKgRate,
      weight: dto.weight,
      distanceCategory,
      hazardousMultiplier,
      total: Math.round(total * 100) / 100,
      currency: 'INR',
      estimatedTransitTime: rates.estimatedTransitTime,
      breakdown: {
        baseCharge: baseRate,
        weightCharge: perKgRate * dto.weight,
        hazardousSurcharge: hazardousMultiplier > 1 ? total - (baseRate + perKgRate * dto.weight) : 0,
      },
    };
  }

  private estimateDistanceCategory(origin: string, destination: string): 'local' | 'regional' | 'national' {
    const same = origin.toLowerCase().split(/[,-\s]+/)[0].trim();
    const dest = destination.toLowerCase().split(/[,-\s]+/)[0].trim();
    if (same === dest) return 'local';
    const nearby: Record<string, string[]> = {
      bangalore: ['mysore', 'hosur', 'tumkur', 'kolar', 'chikballapur'],
      mumbai: ['thane', 'navi mumbai', 'pune', 'nashik'],
      delhi: ['gurgaon', 'noida', 'ghaziabad', 'faridabad'],
      chennai: ['kanchipuram', 'vellore', 'tiruvallur'],
      hyderabad: ['secunderabad', 'medchal', 'rangareddy'],
    };
    for (const [city, suburbs] of Object.entries(nearby)) {
      if ((same === city && suburbs.includes(dest)) || (dest === city && suburbs.includes(same))) return 'regional';
    }
    return 'national';
  }

  private getRateCard(shipmentType: string, distance: 'local' | 'regional' | 'national') {
    const cards: Record<string, Record<string, { baseRate: number; perKgRate: number; estimatedTransitTime: string }>> = {
      FTL: {
        local: { baseRate: 3000, perKgRate: 2, estimatedTransitTime: 'Same day' },
        regional: { baseRate: 5000, perKgRate: 3, estimatedTransitTime: '1-2 days' },
        national: { baseRate: 10000, perKgRate: 5, estimatedTransitTime: '3-7 days' },
      },
      LTL: {
        local: { baseRate: 1500, perKgRate: 3, estimatedTransitTime: 'Same day' },
        regional: { baseRate: 3000, perKgRate: 5, estimatedTransitTime: '2-3 days' },
        national: { baseRate: 6000, perKgRate: 8, estimatedTransitTime: '5-10 days' },
      },
      AIR_FREIGHT: {
        local: { baseRate: 5000, perKgRate: 15, estimatedTransitTime: 'Same day' },
        regional: { baseRate: 8000, perKgRate: 25, estimatedTransitTime: '1 day' },
        national: { baseRate: 12000, perKgRate: 35, estimatedTransitTime: '1-2 days' },
      },
      EXPRESS: {
        local: { baseRate: 2000, perKgRate: 5, estimatedTransitTime: 'Few hours' },
        regional: { baseRate: 4000, perKgRate: 8, estimatedTransitTime: '1 day' },
        national: { baseRate: 8000, perKgRate: 12, estimatedTransitTime: '2-3 days' },
      },
      COURIER: {
        local: { baseRate: 500, perKgRate: 10, estimatedTransitTime: '1 day' },
        regional: { baseRate: 1000, perKgRate: 15, estimatedTransitTime: '2-3 days' },
        national: { baseRate: 2000, perKgRate: 20, estimatedTransitTime: '3-5 days' },
      },
      SEA_FREIGHT: {
        local: { baseRate: 0, perKgRate: 0, estimatedTransitTime: 'Not available for this route' },
        regional: { baseRate: 15000, perKgRate: 2, estimatedTransitTime: '5-10 days' },
        national: { baseRate: 25000, perKgRate: 3, estimatedTransitTime: '10-20 days' },
      },
    };
    return cards[shipmentType]?.[distance] || cards.FTL.national;
  }

  async create(data: {
    tenantId: string;
    leadId: string;
    origin: string;
    destination: string;
    title?: string;
    shipmentType?: string;
    weight?: number;
    cargoType?: string;
    pickupDate?: Date;
    scheduledPickupAt?: Date;
    scheduledDeliveryAt?: Date;
    quotedPrice?: number;
    carrierName?: string;
    notes?: string;
    status?: string;
  }) {
    const shipment = await this.prisma.shipment.create({
      data: {
        tenantId: data.tenantId,
        leadId: data.leadId,
        origin: data.origin,
        destination: data.destination,
        title: data.title || `Shipment: ${data.origin} → ${data.destination}`,
        shipmentType: (data.shipmentType as ShipmentType) || ShipmentType.FTL,
        weight: data.weight,
        cargoType: (data.cargoType as CargoType) || CargoType.GENERAL,
        pickupDate: data.pickupDate,
        scheduledPickupAt: data.scheduledPickupAt,
        scheduledDeliveryAt: data.scheduledDeliveryAt,
        quotedPrice: data.quotedPrice,
        carrierName: data.carrierName,
        notes: data.notes,
        status: (data.status as ShipmentStatus) || ShipmentStatus.QUOTE_REQUESTED,
        trackingNumber: this.generateTrackingNumber(),
      },
    });

    await this.prisma.shipmentStatusHistory.create({
      data: { shipmentId: shipment.id, status: shipment.status, notes: 'Shipment created' },
    });

    return this.findOne(shipment.id);
  }

  async updateStatus(id: string, status: ShipmentStatus, notes?: string, location?: string) {
    const shipment = await this.prisma.shipment.findUnique({ where: { id } });
    if (!shipment) throw new NotFoundException('Shipment not found');

    const [updated] = await Promise.all([
      this.prisma.shipment.update({ where: { id }, data: { status } }),
      this.prisma.shipmentStatusHistory.create({
        data: { shipmentId: id, status, notes: notes || `Status changed to ${status}`, location },
      }),
    ]);

    return updated;
  }

  async findAll(query: {
    tenantId: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const { tenantId, status, search, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = query;
    const where: Prisma.ShipmentWhereInput = { tenantId };

    if (status) where.status = status as ShipmentStatus;
    if (search) {
      where.OR = [
        { origin: { contains: search, mode: 'insensitive' } },
        { destination: { contains: search, mode: 'insensitive' } },
        { trackingNumber: { contains: search, mode: 'insensitive' } },
        { carrierName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const orderBy: any = {};
    orderBy[['createdAt', 'updatedAt', 'pickupDate', 'weight'].includes(sortBy) ? sortBy : 'createdAt'] = sortOrder;

    const [data, total] = await Promise.all([
      this.prisma.shipment.findMany({
        where,
        skip: (+page - 1) * +limit,
        take: +limit,
        orderBy,
        include: {
          lead: { select: { id: true, contact: { select: { name: true, phone: true } } } },
          statusHistory: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      }),
      this.prisma.shipment.count({ where }),
    ]);

    return { data, meta: { total, page: +page, limit: +limit } };
  }

  async findOne(id: string) {
    const shipment = await this.prisma.shipment.findUnique({
      where: { id },
      include: {
        lead: { select: { id: true, contact: { select: { name: true, phone: true, email: true } } } },
        statusHistory: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!shipment) throw new NotFoundException('Shipment not found');
    return shipment;
  }

  async update(id: string, data: any) {
    const shipment = await this.prisma.shipment.findUnique({ where: { id } });
    if (!shipment) throw new NotFoundException('Shipment not found');
    return this.prisma.shipment.update({ where: { id }, data, include: { statusHistory: { orderBy: { createdAt: 'desc' }, take: 1 } } });
  }

  private generateTrackingNumber(): string {
    const prefix = 'SHP';
    const ts = Date.now().toString(36).toUpperCase();
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${ts}-${rand}`;
  }
}
