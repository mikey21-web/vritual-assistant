import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
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

  async create(data: Omit<Prisma.ContactUncheckedCreateInput, 'tenantId'> & { tenantId?: string }, req?: any) {
    // Pre-check for existing contact with same email or phone
    const orClauses: any[] = [];
    if (data.email) orClauses.push({ email: data.email });
    if (data.phone) orClauses.push({ phone: data.phone });
    if (orClauses.length > 0) {
      const existing = await this.prisma.contact.findFirst({ where: { OR: orClauses } });
      if (existing) {
        throw new ConflictException('Contact with this email or phone already exists');
      }
    }
    const c = await this.prisma.contact.create({ data: { ...data, tenantId: getTenantId(req) } });
    return c;
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

  private static readonly MAX_MEMORY_FACTS = 30;
  private static readonly MAX_MEMORY_NOTES = 15;
  private static readonly MEMORY_NOTE_MAX_LEN = 300;

  async getMemory(id: string) {
    const c = await this.prisma.contact.findUnique({ where: { id }, select: { agentMemory: true } });
    if (!c) throw new NotFoundException('Contact not found');
    return (c.agentMemory as any) || { facts: [], notes: [], lastUpdated: null };
  }

  // Bounded, cross-lead, cross-channel memory. Deliberately bypasses the
  // optimistic-locking update() above — this is a soft, best-effort cache
  // written by background agent runs, not a field a concurrent write should
  // ever 409 over.
  async updateMemory(id: string, data: { facts?: { key: string; value: string }[]; note?: string }) {
    const contact = await this.prisma.contact.findUnique({ where: { id }, select: { agentMemory: true } });
    if (!contact) throw new NotFoundException('Contact not found');
    const current = (contact.agentMemory as any) || {};

    let facts: { key: string; value: string; updatedAt: string }[] = current.facts || [];
    if (data.facts?.length) {
      const now = new Date().toISOString();
      for (const f of data.facts) {
        if (!f.key) continue;
        const entry = { key: f.key.slice(0, 100), value: String(f.value ?? '').slice(0, 500), updatedAt: now };
        const idx = facts.findIndex((x) => x.key === entry.key);
        if (idx !== -1) facts[idx] = entry; else facts.push(entry);
      }
      if (facts.length > ContactsService.MAX_MEMORY_FACTS) facts = facts.slice(facts.length - ContactsService.MAX_MEMORY_FACTS);
    }

    let notes: { text: string; createdAt: string }[] = current.notes || [];
    if (data.note && data.note.trim()) {
      notes.push({ text: data.note.trim().slice(0, ContactsService.MEMORY_NOTE_MAX_LEN), createdAt: new Date().toISOString() });
      if (notes.length > ContactsService.MAX_MEMORY_NOTES) notes = notes.slice(notes.length - ContactsService.MAX_MEMORY_NOTES);
    }

    const memory = { facts, notes, lastUpdated: new Date().toISOString() };
    await this.prisma.contact.update({ where: { id }, data: { agentMemory: memory } });
    return memory;
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
