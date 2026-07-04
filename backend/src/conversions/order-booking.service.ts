import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface OrderDetails {
  items: { name: string; quantity: number; price?: number }[];
  notes?: string;
}

const VALID_TRANSITIONS: Record<string, string[]> = {
  REQUESTED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

@Injectable()
export class OrderBookingService {
  private readonly logger = new Logger(OrderBookingService.name);

  constructor(private prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // CREATE ORDER
  // ---------------------------------------------------------------------------
  async createOrder(leadId: string, details: OrderDetails) {
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
      include: { contact: true },
    });
    if (!lead) throw new NotFoundException(`Lead ${leadId} not found`);

    const conversion = await this.prisma.conversion.create({
      data: {
        destination: 'ORDER_BOOKING',
        status: 'REQUESTED',
        leadId,
        metadata: {
          items: details.items,
          notes: details.notes || '',
          requestedAt: new Date().toISOString(),
        },
      },
      include: { lead: { include: { contact: true } } },
    });

    this.logger.log(`Order created: ${conversion.id} for lead ${leadId}`);
    return conversion;
  }

  // ---------------------------------------------------------------------------
  // GET ORDER
  // ---------------------------------------------------------------------------
  async getOrder(id: string) {
    const conversion = await this.prisma.conversion.findUnique({
      where: { id },
      include: { lead: { include: { contact: true, assignedAgent: true } } },
    });
    if (!conversion) throw new NotFoundException(`Order ${id} not found`);
    if (conversion.destination !== 'ORDER_BOOKING') {
      throw new BadRequestException(`Conversion ${id} is not an order`);
    }
    return conversion;
  }

  // ---------------------------------------------------------------------------
  // UPDATE ORDER STATUS
  // ---------------------------------------------------------------------------
  async updateOrderStatus(id: string, status: string) {
    const conversion = await this.prisma.conversion.findUnique({
      where: { id },
      include: { lead: { include: { contact: true } } },
    });
    if (!conversion) throw new NotFoundException(`Order ${id} not found`);
    if (conversion.destination !== 'ORDER_BOOKING') {
      throw new BadRequestException(`Conversion ${id} is not an order`);
    }

    const allowed = VALID_TRANSITIONS[conversion.status] || [];
    if (!allowed.includes(status)) {
      throw new BadRequestException(
        `Cannot transition order from ${conversion.status} to ${status}. Allowed transitions: ${allowed.join(', ') || '(none)'}`,
      );
    }

    const metadata = conversion.metadata as any;
    const updateData: any = { status };
    if (status === 'COMPLETED' || status === 'CANCELLED') {
      updateData.completedAt = new Date();
    }

    const updated = await this.prisma.conversion.update({
      where: { id },
      data: {
        ...updateData,
        metadata: { ...metadata, statusChangedAt: new Date().toISOString(), previousStatus: conversion.status },
      },
      include: { lead: { include: { contact: true, assignedAgent: true } } },
    });

    this.logger.log(`Order ${id} status updated: ${conversion.status} → ${status}`);
    return updated;
  }

  // ---------------------------------------------------------------------------
  // LIST ORDERS BY LEAD
  // ---------------------------------------------------------------------------
  async getOrdersByLead(leadId: string) {
    const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) throw new NotFoundException(`Lead ${leadId} not found`);

    return this.prisma.conversion.findMany({
      where: { leadId, destination: 'ORDER_BOOKING' },
      orderBy: { createdAt: 'desc' },
      include: { lead: { include: { contact: true } } },
    });
  }
}
