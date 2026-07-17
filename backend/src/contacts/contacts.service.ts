import { Injectable, NotFoundException, ConflictException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AdvancedFeaturesService } from '../advanced-features/advanced-features.service';
import { getTenantId } from '../shared/tenant-helper';

@Injectable()
export class ContactsService {
  constructor(
    private prisma: PrismaService,
    private auditLogs: AuditLogsService,
    @Inject(forwardRef(() => AdvancedFeaturesService)) private advanced: AdvancedFeaturesService,
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

  async findOrCreate(data: { phone?: string; email?: string; name?: string; whatsapp?: string; company?: string }, req?: any) {
    return this.prisma.$transaction(async (tx) => {
      // Single OR query to avoid race condition between sequential lookups
      const orClauses: any[] = [];
      if (data.phone) orClauses.push({ phone: data.phone });
      if (data.email) orClauses.push({ email: data.email });

      if (orClauses.length > 0) {
        const existing = await tx.contact.findFirst({ where: { OR: orClauses } });
        if (existing) {
          return tx.contact.update({
            where: { id: existing.id },
            data: {
              name: data.name ?? existing.name,
              email: data.email ?? existing.email,
              phone: data.phone ?? existing.phone,
              whatsapp: data.whatsapp ?? existing.whatsapp,
              company: data.company ?? existing.company,
            },
          });
        }
      }

      return tx.contact.create({
        data: { name: data.name, email: data.email, phone: data.phone, whatsapp: data.whatsapp, company: data.company, tenantId: getTenantId(req) },
      });
    }, { isolationLevel: 'Serializable' });
  }

  async create(data: Prisma.ContactUncheckedCreateInput, req?: any) {
    const orClauses: any[] = [];
    if (data.email) orClauses.push({ email: data.email });
    if (data.phone) orClauses.push({ phone: data.phone });

    try {
      return await this.prisma.$transaction(async (tx) => {
        if (orClauses.length > 0) {
          const existing = await tx.contact.findFirst({ where: { OR: orClauses } });
          if (existing) {
            throw new ConflictException('Contact with this email or phone already exists');
          }
        }
        return tx.contact.create({ data: { ...data, tenantId: getTenantId(req) } as Prisma.ContactUncheckedCreateInput });
      }, { isolationLevel: 'Serializable' });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2034') {
        throw new ConflictException('Contact with this email or phone already exists');
      }
      throw err;
    }
  }

  async update(id: string, data: Prisma.ContactUpdateInput) {
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
