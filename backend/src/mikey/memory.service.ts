import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MemoryType } from '@prisma/client';

@Injectable()
export class MemoryService {
  private readonly logger = new Logger(MemoryService.name);

  constructor(private prisma: PrismaService) {}

  async store(tenantId: string, entry: {
    type: MemoryType;
    key: string;
    value: string;
    summary?: string;
    source?: string;
    leadId?: string;
    episodeStart?: Date;
    episodeEnd?: Date;
    confidence?: number;
    metadata?: any;
  }) {
    return this.prisma.mikeyMemory.create({
      data: {
        tenantId,
        type: entry.type,
        key: entry.key,
        value: entry.value,
        summary: entry.summary || entry.value.slice(0, 200),
        source: entry.source || 'system',
        leadId: entry.leadId,
        episodeStart: entry.episodeStart,
        episodeEnd: entry.episodeEnd,
        validAt: new Date(),
        confidence: entry.confidence ?? 0.5,
        metadata: entry.metadata || {},
      },
    });
  }

  async query(tenantId: string, opts: {
    type?: MemoryType;
    key?: string;
    leadId?: string;
    search?: string;
    limit?: number;
  }) {
    const where: any = { tenantId, invalidAt: null };
    if (opts.type) where.type = opts.type;
    if (opts.key) where.key = { contains: opts.key, mode: 'insensitive' };
    if (opts.leadId) where.leadId = opts.leadId;
    if (opts.search) {
      where.OR = [
        { value: { contains: opts.search, mode: 'insensitive' } },
        { summary: { contains: opts.search, mode: 'insensitive' } },
      ];
    }
    return this.prisma.mikeyMemory.findMany({
      where,
      orderBy: { confidence: 'desc' },
      take: opts.limit || 20,
    });
  }

  async recallRecent(tenantId: string, type: MemoryType, limit = 10) {
    return this.prisma.mikeyMemory.findMany({
      where: { tenantId, type, invalidAt: null },
      orderBy: { validAt: 'desc' },
      take: limit,
    });
  }

  async getWorkingMemory(tenantId: string, leadId?: string) {
    const where: any = { tenantId, type: 'WORKING', invalidAt: null };
    if (leadId) where.leadId = leadId;
    return this.prisma.mikeyMemory.findFirst({ where, orderBy: { validAt: 'desc' } });
  }

  async setWorkingMemory(tenantId: string, state: any, leadId?: string) {
    await this.prisma.mikeyMemory.updateMany({
      where: { tenantId, type: 'WORKING', leadId: leadId || null, invalidAt: null },
      data: { invalidAt: new Date() },
    });
    return this.store(tenantId, {
      type: 'WORKING',
      key: `working:${leadId || 'global'}`,
      value: JSON.stringify(state),
      source: 'system',
      leadId,
    });
  }

  async invalidate(id: string) {
    return this.prisma.mikeyMemory.update({
      where: { id },
      data: { invalidAt: new Date() },
    });
  }

  // ── Procedural rules ──────────────────────────────────────────────────

  async proposeRule(tenantId: string, rule: string, rationale: string, category?: string) {
    return this.prisma.mikeyProceduralRule.create({
      data: { tenantId, rule, rationale, category: category || 'general', status: 'pending' },
    });
  }

  async approveRule(id: string, approvedById: string) {
    return this.prisma.mikeyProceduralRule.update({
      where: { id },
      data: { status: 'approved', approvedAt: new Date(), approvedById },
    });
  }

  async getActiveRules(tenantId: string, category?: string) {
    const where: any = { tenantId, status: 'active' };
    if (category) where.category = category;
    return this.prisma.mikeyProceduralRule.findMany({ where, orderBy: { applyCount: 'desc' } });
  }

  async applyRule(id: string) {
    return this.prisma.mikeyProceduralRule.update({
      where: { id },
      data: { applyCount: { increment: 1 }, lastAppliedAt: new Date() },
    });
  }

  async retireRule(id: string) {
    return this.prisma.mikeyProceduralRule.update({
      where: { id },
      data: { status: 'retired', retireAt: new Date() },
    });
  }

  // ── Reflexion logs ────────────────────────────────────────────────────

  async logReflexion(tenantId: string, entry: {
    outcomeType: string;
    entityId?: string;
    trajectory: any[];
    reflection: string;
    candidateRule?: string | null;
    perspectives?: any;
  }) {
    return this.prisma.mikeyReflexionLog.create({
      data: {
        tenantId,
        outcomeType: entry.outcomeType,
        entityId: entry.entityId,
        trajectory: entry.trajectory,
        reflection: entry.reflection,
        candidateRule: entry.candidateRule,
        perspectives: entry.perspectives || {},
      },
    });
  }

  async getPendingRules(tenantId: string) {
    return this.prisma.mikeyProceduralRule.findMany({
      where: { tenantId, status: 'pending' },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getStats(tenantId: string) {
    const [memoryCount, activeRules, pendingRules, reflexionCount] = await Promise.all([
      this.prisma.mikeyMemory.count({ where: { tenantId, invalidAt: null } }),
      this.prisma.mikeyProceduralRule.count({ where: { tenantId, status: 'active' } }),
      this.prisma.mikeyProceduralRule.count({ where: { tenantId, status: 'pending' } }),
      this.prisma.mikeyReflexionLog.count({ where: { tenantId } }),
    ]);
    return { memoryCount, activeRules, pendingRules, reflexionCount };
  }
}
