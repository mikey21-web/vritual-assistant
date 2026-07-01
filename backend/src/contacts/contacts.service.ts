import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AdvancedFeaturesService } from '../advanced-features/advanced-features.service';
import { tenantConnect } from '../shared/tenant-helper';

@Injectable()
export class ContactsService {
  constructor(
    private prisma: PrismaService,
    private auditLogs: AuditLogsService,
    private advanced: AdvancedFeaturesService,
  ) {}

  async findAll(query: any = {}) {
    const { page = 1, limit = 20, search } = query;
    const where: any = { deletedAt: null };
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

  async findOrCreate(data: { phone?: string; email?: string; name?: string; whatsapp?: string; company?: string }) {
    return this.prisma.$transaction(async (tx) => {
      if (data.phone) {
        const existing = await tx.contact.findFirst({ where: { phone: data.phone } });
        if (existing) {
          return tx.contact.update({
            where: { id: existing.id },
            data: { name: data.name ?? existing.name, email: data.email ?? existing.email, whatsapp: data.whatsapp ?? existing.whatsapp, company: data.company ?? existing.company },
          });
        }
      }
      if (data.email) {
        const existing = await tx.contact.findFirst({ where: { email: data.email } });
        if (existing) {
          return tx.contact.update({
            where: { id: existing.id },
            data: { name: data.name ?? existing.name, phone: data.phone ?? existing.phone, whatsapp: data.whatsapp ?? existing.whatsapp, company: data.company ?? existing.company },
          });
        }
      }
      return tx.contact.create({
        data: { name: data.name, email: data.email, phone: data.phone, whatsapp: data.whatsapp, company: data.company, tenantId: 'default-tenant' },
      });
    }, { isolationLevel: 'Serializable' });
  }

  async create(data: any) {
    const c = await this.prisma.contact.create({ data });
    return c;
  }

  async update(id: string, data: any) {
    const existing = await this.findOne(id);
    try {
      return await this.prisma.contact.update({
        where: { id, version: existing.version },
        data: { ...data, version: { increment: 1 } },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
        throw new ConflictException('Contact was modified by another request. Please refresh and retry.');
      }
      throw err;
    }
  }

  async remove(id: string): Promise<{ message: string }> {
    const existing = await this.findOne(id);
    await this.prisma.contact.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { message: 'Contact soft-deleted successfully.' };
  }
}
