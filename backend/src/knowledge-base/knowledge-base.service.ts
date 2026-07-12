import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class KnowledgeBaseService {
  constructor(private prisma: PrismaService, private auditLogs: AuditLogsService) {}

  findAll(query: any = {}) {
    const { category, active } = query;
    const where: any = {};
    if (category) where.category = category;
    if (active !== undefined) where.active = active === 'false' ? false : Boolean(active);
    return this.prisma.knowledgeBaseEntry.findMany({ where, orderBy: { updatedAt: 'desc' } });
  }

  async findOne(id: string) {
    const e = await this.prisma.knowledgeBaseEntry.findUnique({ where: { id } });
    if (!e) throw new NotFoundException('Knowledge base entry not found');
    return e;
  }

  async create(data: any, userId?: string) {
    const e = await this.prisma.knowledgeBaseEntry.create({ data: { ...data, keywords: data.keywords || [] } });
    await this.auditLogs.log('knowledge_base_entry_created', 'KnowledgeBaseEntry', e.id, userId);
    return e;
  }

  async update(id: string, data: any, userId?: string) {
    await this.findOne(id);
    const e = await this.prisma.knowledgeBaseEntry.update({ where: { id }, data });
    await this.auditLogs.log('knowledge_base_entry_updated', 'KnowledgeBaseEntry', id, userId, data);
    return e;
  }

  async remove(id: string, userId?: string) {
    await this.findOne(id);
    await this.prisma.knowledgeBaseEntry.delete({ where: { id } });
    await this.auditLogs.log('knowledge_base_entry_deleted', 'KnowledgeBaseEntry', id, userId);
    return { deleted: true };
  }

  // Keyword search used by the agent to answer lead questions instead of
  // guessing or escalating. Not a vector search — matches on question/answer
  // text and the entry's curated keywords, which is enough signal for a
  // small, client-authored FAQ set.
  async search(query: string) {
    const q = (query || '').trim();
    if (!q) return [];

    const terms = q
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 2)
      .slice(0, 8);
    if (terms.length === 0) terms.push(q);

    const entries = await this.prisma.knowledgeBaseEntry.findMany({
      where: {
        active: true,
        OR: [
          { question: { contains: q, mode: 'insensitive' } },
          { answer: { contains: q, mode: 'insensitive' } },
          { keywords: { hasSome: terms } },
          ...terms.map((t) => ({ question: { contains: t, mode: 'insensitive' as const } })),
        ],
      },
      take: 5,
    });
    return entries;
  }
}
