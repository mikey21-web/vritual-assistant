import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AdvancedFeaturesService } from '../advanced-features/advanced-features.service';

@Injectable()
export class ContactsService {
  constructor(
    private prisma: PrismaService,
    private auditLogs: AuditLogsService,
    private advanced: AdvancedFeaturesService,
  ) {}

  async findAll(query: any = {}) {
    const { page = 1, limit = 20, search } = query;
    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
      ];
    }
    const [data, total] = await Promise.all([
      this.prisma.contact.findMany({ where, skip: (+page - 1) * +limit, take: +limit, orderBy: { createdAt: 'desc' }, include: { _count: { select: { leads: true } } } }),
      this.prisma.contact.count({ where }),
    ]);
    return { data, meta: { total, page: +page, limit: +limit } };
  }

  async findOne(id: string) {
    const c = await this.prisma.contact.findUnique({ where: { id }, include: { leads: true, _count: { select: { leads: true } } } });
    if (!c) throw new NotFoundException('Contact not found');
    return c;
  }

  async findOrCreate(data: { phone?: string; email?: string; name?: string; whatsapp?: string; company?: string; tenantId?: string }) {
    const tenantId = data.tenantId;

    if (data.phone && tenantId) {
      return this.prisma.contact.upsert({
        where: { tenantId_phone: { tenantId, phone: data.phone } },
        update: {
          name: data.name,
          email: data.email,
          whatsapp: data.whatsapp,
          company: data.company,
        },
        create: {
          name: data.name,
          email: data.email,
          phone: data.phone,
          whatsapp: data.whatsapp,
          company: data.company,
          tenantId,
        },
      });
    }

    if (data.email && tenantId) {
      return this.prisma.contact.upsert({
        where: { tenantId_email: { tenantId, email: data.email } },
        update: {
          name: data.name,
          phone: data.phone,
          whatsapp: data.whatsapp,
          company: data.company,
        },
        create: {
          name: data.name,
          email: data.email,
          phone: data.phone,
          whatsapp: data.whatsapp,
          company: data.company,
          tenantId,
        },
      });
    }

    return this.prisma.contact.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        whatsapp: data.whatsapp,
        company: data.company,
        tenantId: tenantId ?? null,
      },
    });
  }

  async create(data: any) {
    const c = await this.prisma.contact.create({ data });
    return c;
  }

  async update(id: string, data: any) {
    await this.findOne(id);
    const c = await this.prisma.contact.update({ where: { id }, data });
    return c;
  }
}
