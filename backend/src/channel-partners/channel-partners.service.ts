import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChannelPartnersService {
  constructor(private prisma: PrismaService) {}

  create(data: {
    tenantId: string;
    name: string;
    company?: string;
    phone?: string;
    email?: string;
    reraId?: string;
    commissionRate?: number;
    notes?: string;
  }) {
    return this.prisma.channelPartner.create({ data });
  }

  async findAll(query: { status?: string; search?: string; page?: number; limit?: number }) {
    const { status, search, page = 1, limit = 50 } = query;
    const where: any = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }
    const [data, total] = await Promise.all([
      this.prisma.channelPartner.findMany({
        where,
        skip: (+page - 1) * +limit,
        take: +limit,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { leads: true } } },
      }),
      this.prisma.channelPartner.count({ where }),
    ]);
    return { data, meta: { total, page: +page, limit: +limit } };
  }

  async findOne(id: string) {
    const partner = await this.prisma.channelPartner.findUnique({
      where: { id },
      include: { _count: { select: { leads: true } }, leads: { take: 5, orderBy: { createdAt: 'desc' } } },
    });
    if (!partner) throw new NotFoundException('Channel partner not found');
    return partner;
  }

  async update(id: string, data: any) {
    await this.findOne(id);
    return this.prisma.channelPartner.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findOne(id);
    // Detach leads first so we don't orphan a FK; the lead stays, just unlinked.
    await this.prisma.lead.updateMany({ where: { channelPartnerId: id }, data: { channelPartnerId: null } });
    return this.prisma.channelPartner.delete({ where: { id } });
  }

  /** Allocate a lead to a partner (or clear it with partnerId = null). */
  async allocateLead(leadId: string, partnerId: string | null) {
    const lead = await this.prisma.lead.findUnique({ where: { id: leadId }, select: { id: true } });
    if (!lead) throw new NotFoundException('Lead not found');
    if (partnerId) {
      const partner = await this.prisma.channelPartner.findUnique({ where: { id: partnerId }, select: { id: true } });
      if (!partner) throw new BadRequestException('Channel partner not found');
    }
    return this.prisma.lead.update({ where: { id: leadId }, data: { channelPartnerId: partnerId } });
  }

  /** Advance onboarding stage (INVITED -> DOCS_PENDING -> TRAINING_PENDING -> ACTIVE). */
  async updateOnboardingStatus(id: string, onboardingStatus: string) {
    await this.findOne(id);
    return this.prisma.channelPartner.update({ where: { id }, data: { onboardingStatus: onboardingStatus as any } });
  }

  async markTrainingComplete(id: string) {
    await this.findOne(id);
    return this.prisma.channelPartner.update({
      where: { id },
      data: { trainingCompletedAt: new Date(), onboardingStatus: 'ACTIVE' },
    });
  }

  /** Partners whose RERA registration or agreement expires within `days` (default 30), for renewal follow-up. */
  async expiryAlerts(tenantId: string, days = 30) {
    const cutoff = new Date(Date.now() + days * 86400000);
    const partners = await this.prisma.channelPartner.findMany({
      where: {
        tenantId,
        OR: [
          { reraExpiryAt: { not: null, lte: cutoff } },
          { agreementExpiryAt: { not: null, lte: cutoff } },
        ],
      },
      select: { id: true, name: true, reraId: true, reraExpiryAt: true, agreementExpiryAt: true },
    });
    return partners.map(p => ({
      ...p,
      reraExpiring: !!p.reraExpiryAt && p.reraExpiryAt <= cutoff,
      agreementExpiring: !!p.agreementExpiryAt && p.agreementExpiryAt <= cutoff,
    }));
  }

  /**
   * Per-partner performance: leads sourced, converted, conversion rate, and
   * estimated commission owed on converted deal value.
   */
  async performance(id: string) {
    const partner = await this.findOne(id);

    const leads = await this.prisma.lead.findMany({
      where: { channelPartnerId: id },
      select: { status: true, dealValue: true },
    });

    const total = leads.length;
    const converted = leads.filter(l => l.status === 'CONVERTED');
    const convertedCount = converted.length;
    const convertedValue = converted.reduce((sum, l) => sum + (l.dealValue || 0), 0);
    const rate = partner.commissionRate || 0;
    const commissionOwed = (convertedValue * rate) / 100;

    return {
      partnerId: id,
      name: partner.name,
      totalLeads: total,
      convertedLeads: convertedCount,
      conversionRate: total > 0 ? convertedCount / total : 0,
      convertedValue,
      commissionRate: rate,
      commissionOwed,
    };
  }

  async lockBuyerToPartner(partnerId: string, buyerPhone: string) {
    const partner = await this.prisma.channelPartner.findUnique({ where: { id: partnerId } });
    if (!partner) throw new NotFoundException('Channel partner not found');

    const existing = await this.prisma.lead.findFirst({
      where: { contact: { phone: buyerPhone }, channelPartnerId: { not: null } },
      include: { channelPartner: true },
    });
    if (existing && existing.channelPartnerId !== partnerId) {
      throw new ConflictException(`Buyer already associated with partner "${existing.channelPartner?.name}"`);
    }
    return { locked: true, partnerId, buyerPhone };
  }

  async checkBuyerLock(buyerPhone: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { contact: { phone: buyerPhone }, channelPartnerId: { not: null } },
      include: { channelPartner: { select: { id: true, name: true, company: true } } },
    });
    if (!lead) return { locked: false };
    return { locked: true, partner: lead.channelPartner };
  }

  async getAvailableInventory(tenantId: string, filters: { projectId?: string; towerId?: string; unitType?: string; minPrice?: number; maxPrice?: number }) {
    const where: any = { tenantId, status: 'AVAILABLE' };
    if (filters.projectId) where.projectId = filters.projectId;
    if (filters.towerId) where.towerId = filters.towerId;
    if (filters.unitType) where.unitType = filters.unitType;
    if (filters.minPrice || filters.maxPrice) {
      where.price = {};
      if (filters.minPrice) where.price.gte = filters.minPrice;
      if (filters.maxPrice) where.price.lte = filters.maxPrice;
    }
    return this.prisma.unit.findMany({
      where,
      select: {
        id: true, unitNumber: true, floor: true, unitType: true,
        areaSqft: true, price: true,
        tower: { select: { id: true, name: true, project: { select: { id: true, name: true } } } },
      },
      orderBy: { unitNumber: 'asc' },
    });
  }
}


