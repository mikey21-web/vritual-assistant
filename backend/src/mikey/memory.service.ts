import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MemoryType } from '@prisma/client';
import { EmbeddingService } from './embedding.service';

const MAX_RULES_PER_PROMPT = 5;
const AUTO_RETIRE_THRESHOLD = -0.05;

@Injectable()
export class MemoryService {
  private readonly logger = new Logger(MemoryService.name);

  constructor(
    private prisma: PrismaService,
    private embedder: EmbeddingService,
  ) {}

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

  // ── Vector search (pgvector-style, app-level) ─────────────────────────

  async searchBySimilarity(tenantId: string, query: string, type?: MemoryType, leadId?: string, topK = 5) {
    const queryEmbedding = await this.embedder.embed(query);
    if (!queryEmbedding?.length) return [];

    const where: any = { tenantId, invalidAt: null };
    if (type) where.type = type;
    if (leadId) where.leadId = leadId;

    const candidates = await this.prisma.mikeyMemory.findMany({ where, select: { id: true, embedding: true, value: true, summary: true, key: true } });
    const withEmbedding = candidates.filter(c => c.embedding?.length > 0) as { id: string; embedding: number[]; value: string; summary: string | null; key: string }[];

    const scored = await this.embedder.findSimilar(queryEmbedding, withEmbedding, topK);
    return scored.map(s => {
      const match = withEmbedding.find(c => c.id === s.id);
      return { id: s.id, score: s.score, value: match?.value, summary: match?.summary, key: match?.key };
    });
  }

  async storeWithEmbedding(tenantId: string, entry: {
    type: MemoryType; key: string; value: string; summary?: string;
    source?: string; leadId?: string; confidence?: number; metadata?: any;
  }) {
    const embedding = await this.embedder.embed(entry.summary || entry.value);
    return this.prisma.mikeyMemory.create({
      data: {
        tenantId, type: entry.type, key: entry.key, value: entry.value,
        summary: entry.summary || entry.value.slice(0, 200),
        source: entry.source || 'system', leadId: entry.leadId,
        validAt: new Date(),
        confidence: entry.confidence ?? 0.5,
        embedding: embedding.length > 0 ? embedding : undefined,
        metadata: entry.metadata || {},
      },
    });
  }

  // ── Procedural rules ──────────────────────────────────────────────────

  async proposeRule(tenantId: string, rule: string, rationale: string, category?: string) {
    const embedding = await this.embedder.embed(rule);
    return this.prisma.mikeyProceduralRule.create({
      data: {
        tenantId, rule, rationale, category: category || 'general',
        status: 'pending',
        metadata: embedding.length > 0 ? { embedding } : {},
      },
    });
  }

  async approveRule(id: string, approvedById: string) {
    return this.prisma.mikeyProceduralRule.update({
      where: { id },
      data: { status: 'active', approvedAt: new Date(), approvedById },
    });
  }

  async getActiveRules(tenantId: string, category?: string) {
    const where: any = { tenantId, status: 'active' };
    if (category) where.category = category;
    return this.prisma.mikeyProceduralRule.findMany({ where, orderBy: { applyCount: 'desc' } });
  }

  async getRelevantRules(tenantId: string, context: string, category?: string, maxRules = MAX_RULES_PER_PROMPT) {
    const allActive = await this.getActiveRules(tenantId, category);
    if (allActive.length <= maxRules) return allActive;
    if (!context) return allActive.slice(0, maxRules);

    const contextEmbedding = await this.embedder.embed(context);
    if (!contextEmbedding?.length) return allActive.slice(0, maxRules);

    const withEmbedding = allActive
      .filter(r => (r.metadata as any)?.embedding?.length > 0)
      .map(r => ({
        id: r.id, rule: r.rule, rationale: r.rationale, category: r.category,
        applyCount: r.applyCount, status: r.status,
        score: this.embedder.cosineSimilarity(contextEmbedding, (r.metadata as any).embedding),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, maxRules);

    if (withEmbedding.length < maxRules) {
      const remaining = allActive
        .filter(a => !a.metadata || !(a.metadata as any).embedding?.length)
        .slice(0, maxRules - withEmbedding.length)
        .map(r => ({
          id: r.id, rule: r.rule, rationale: r.rationale, category: r.category,
          applyCount: r.applyCount, status: r.status, score: 0,
        }));
      withEmbedding.push(...remaining);
    }

    return withEmbedding;
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

  async recordRuleImpact(ruleId: string, impactDelta: number, metric: string) {
    const rule = await this.prisma.mikeyProceduralRule.findUnique({ where: { id: ruleId } });
    if (!rule) return;

    const prevDelta = rule.impactDelta || 0;
    const prevCount = rule.applyCount || 0;
    const newDelta = prevCount > 0
      ? (prevDelta * prevCount + impactDelta) / (prevCount + 1)
      : impactDelta;

    await this.prisma.mikeyProceduralRule.update({
      where: { id: ruleId },
      data: { impactDelta: newDelta, impactMetric: metric },
    });

    if (newDelta < AUTO_RETIRE_THRESHOLD && rule.applyCount >= 3) {
      this.logger.warn(`Auto-retiring rule ${ruleId}: impact ${newDelta} below threshold ${AUTO_RETIRE_THRESHOLD}`);
      await this.retireRule(ruleId);
    }
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
