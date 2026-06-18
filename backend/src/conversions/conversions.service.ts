import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ConversionsService {
  constructor(private prisma: PrismaService) {}

  findAll(query: any = {}) {
    const { destination, status, leadId, page = 1, limit = 20 } = query;
    const where: any = {};
    if (destination) where.destination = destination;
    if (status) where.status = status;
    if (leadId) where.leadId = leadId;
    return Promise.all([
      this.prisma.conversion.findMany({ where, skip: (+page - 1) * +limit, take: +limit, orderBy: { createdAt: 'desc' }, include: { lead: { select: { id: true, contact: { select: { name: true } } } } } }),
      this.prisma.conversion.count({ where }),
    ]).then(([data, total]) => ({ data, meta: { total, page: +page, limit: +limit } }));
  }

  create(data: any) { return this.prisma.conversion.create({ data }); }

  createForLead(leadId: string, data: any) { return this.prisma.conversion.create({ data: { ...data, leadId } }); }

  async update(id: string, data: any) {
    const c = await this.prisma.conversion.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('Conversion not found');
    return this.prisma.conversion.update({ where: { id }, data });
  }
}
