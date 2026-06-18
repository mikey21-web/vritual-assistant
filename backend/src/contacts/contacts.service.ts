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
    if (data.phone) {
      const existing = await this.prisma.contact.findFirst({ where: { phone: data.phone } });
      if (existing) return existing;
    }
    if (data.email) {
      const existing = await this.prisma.contact.findFirst({ where: { email: data.email } });
      if (existing) return existing;
    }
    try {
      return await this.prisma.contact.create({ data: { ...data, tenantId: data.tenantId } });
    } catch (e: any) {
      if (e.code === 'P2002') {
        return this.findOrCreate(data);
      }
      throw e;
    }
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
