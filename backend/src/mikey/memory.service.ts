import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MemoryType } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

const MAX_RULES_PER_PROMPT = 5;
const AUTO_RETIRE_THRESHOLD = -0.05;

@Injectable()
export class MemoryService {
  private readonly logger = new Logger(MemoryService.name);
  private client: OpenAI;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    const apiKey = this.config.get<string>('DEEPSEEK_API_KEY');
    const baseURL = this.config.get<string>('DEEPSEEK_BASE_URL') || 'https://api.deepseek.com/v1';
    if (apiKey) {
      this.client = new OpenAI({ apiKey, baseURL, timeout: 20000, maxRetries: 1 });
    }
  }

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

  // ── Embedding ──────────────────────────────────────────────────────────

  async embed(text: string): Promise<number[]> {
    if (!text || !this.client) return [];
    try {
      const response = await this.client.embeddings.create({
        model: 'deepseek-chat',
        input: text.slice(0, 8000),
      });
      return response.data[0]?.embedding || [];
    } catch (err: any) {
      this.logger.warn(`Embedding failed: ${err.message}`);
      return [];
    }
  }

  cosineSimilarity(a: number[], b: number[]): number {
    if (!a?.length || !b?.length || a.length !== b.length) return 0;
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : dot / denom;
  }

  async findSimilar(target: number[], candidates: { id: string; embedding: number[] }[], topK = 5): Promise<{ id: string; score: number }[]> {
    if (!target?.length || !candidates?.length) return [];
    const scored = candidates
      .filter(c => c.embedding?.length > 0)
      .map(c => ({ id: c.id, score: this.cosineSimilarity(target, c.embedding) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
    return scored.filter(s => s.score > 0.3);
  }

  // ── Vector search ──────────────────────────────────────────────────────

  async searchBySimilarity(tenantId: string, query: string, type?: MemoryType, leadId?: string, topK = 5) {
    const queryEmbedding = await this.embed(query);
    if (!queryEmbedding?.length) return [];
    const where: any = { tenantId, invalidAt: null };
    if (type) where.type = type;
    if (leadId) where.leadId = leadId;
    const candidates = await this.prisma.mikeyMemory.findMany({ where, select: { id: true, embedding: true, value: true, summary: true, key: true } });
    const withEmbedding = candidates.filter(c => c.embedding?.length > 0) as { id: string; embedding: number[]; value: string; summary: string | null; key: string }[];
    const scored = await this.findSimilar(queryEmbedding, withEmbedding, topK);
    return scored.map(s => {
      const match = withEmbedding.find(c => c.id === s.id);
      return { id: s.id, score: s.score, value: match?.value, summary: match?.summary, key: match?.key };
    });
  }

  async storeWithEmbedding(tenantId: string, entry: {
    type: MemoryType; key: string; value: string; summary?: string;
    source?: string; leadId?: string; confidence?: number; metadata?: any;
  }) {
    const embedding = await this.embed(entry.summary || entry.value);
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
    const embedding = await this.embed(rule);
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
    const contextEmbedding = await this.embed(context);
    if (!contextEmbedding?.length) return allActive.slice(0, maxRules);
    const withEmbedding = allActive
      .filter(r => (r.metadata as any)?.embedding?.length > 0)
      .map(r => ({
        id: r.id, rule: r.rule, rationale: r.rationale, category: r.category,
        applyCount: r.applyCount, status: r.status,
        score: this.cosineSimilarity(contextEmbedding, (r.metadata as any).embedding),
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

  // ── Reflexion ──────────────────────────────────────────────────────────

  async reflectOnOutcome(tenantId: string, outcomeType: string, entityId: string) {
    const trajectory = await this.buildTrajectory(tenantId, outcomeType, entityId);
    if (!trajectory || trajectory.length < 2) {
      this.logger.debug(`Reflexion: insufficient trajectory for ${outcomeType}:${entityId}`);
      return null;
    }
    const outcome = await this.getOutcome(tenantId, outcomeType, entityId);
    const reflection = await this.generateReflection(trajectory, outcome);
    const perspectives = await this.generateMultiPerspectives(trajectory, reflection);
    let candidateRule: string | null = null;
    if (reflection.lesson && reflection.success === false) {
      candidateRule = await this.extractProceduralRule(trajectory, reflection, perspectives);
    }
    await this.logReflexion(tenantId, {
      outcomeType,
      entityId,
      trajectory,
      reflection: reflection.narrative,
      candidateRule,
      perspectives,
    });
    if (candidateRule) {
      await this.proposeRule(
        tenantId,
        candidateRule,
        reflection.lesson || 'Learned from experience',
        this.categorizeRule(outcomeType),
      );
      this.logger.log(`Reflexion: proposed rule "${candidateRule.slice(0, 80)}..." for ${outcomeType}:${entityId}`);
    }
    return { reflection, candidateRule, perspectives };
  }

  private async buildTrajectory(tenantId: string, outcomeType: string, entityId: string): Promise<any[]> {
    const actions: any[] = [];
    if (outcomeType === 'lead_converted' || outcomeType === 'lead_lost') {
      const events = await this.prisma.systemEvent.findMany({
        where: { leadId: entityId, type: { startsWith: 'mikey.' } },
        orderBy: { createdAt: 'asc' },
        take: 50,
      });
      for (const e of events) {
        actions.push({ time: e.createdAt.toISOString(), type: e.type, payload: e.payload });
      }
      const messages = await this.prisma.conversationMessage.findMany({
        where: { leadId: entityId },
        orderBy: { createdAt: 'asc' },
        take: 30,
        select: { direction: true, text: true, createdAt: true },
      });
      for (const m of messages) {
        actions.push({ time: m.createdAt.toISOString(), type: `message_${m.direction?.toLowerCase() || 'unknown'}`, payload: { text: (m.text || '').slice(0, 200) } });
      }
    }
    if (outcomeType === 'campaign_result') {
      const campaign = await this.prisma.campaign.findUnique({ where: { id: entityId }, include: { leads: true } });
      if (campaign) {
        actions.push({ time: campaign.createdAt.toISOString(), type: 'campaign_created', payload: { name: campaign.name } });
        actions.push({ time: campaign.updatedAt.toISOString(), type: 'campaign_result', payload: { leadsCount: campaign.leads?.length || 0, active: campaign.active } });
      }
    }
    if (outcomeType === 'booking_outcome') {
      const booking = await this.prisma.booking.findUnique({ where: { id: entityId } });
      if (booking) {
        actions.push({ time: booking.createdAt.toISOString(), type: 'booking_created', payload: { status: booking.status } });
        actions.push({ time: booking.updatedAt.toISOString(), type: 'booking_status', payload: { status: booking.status } });
      }
    }
    return actions.sort((a, b) => a.time.localeCompare(b.time));
  }

  private async getOutcome(tenantId: string, outcomeType: string, entityId: string): Promise<string> {
    if (outcomeType === 'lead_converted') return 'The lead was successfully converted.';
    if (outcomeType === 'lead_lost') return 'The lead was lost or marked as unqualified.';
    if (outcomeType === 'campaign_result') {
      const campaign = await this.prisma.campaign.findUnique({ where: { id: entityId }, select: { active: true, name: true } });
      return campaign ? `Campaign '${campaign.name}' active: ${campaign.active}` : 'Campaign completed.';
    }
    if (outcomeType === 'booking_outcome') {
      const booking = await this.prisma.booking.findUnique({ where: { id: entityId }, select: { status: true } });
      return booking ? `Booking finished with status: ${booking.status}` : 'Booking completed.';
    }
    return 'Outcome recorded.';
  }

  private async generateReflection(trajectory: any[], outcome: string): Promise<{ narrative: string; lesson: string; success: boolean }> {
    if (!this.client) return { narrative: 'No LLM available for reflection.', lesson: '', success: true };
    const trajectorySummary = trajectory.map(t => `[${t.type}] ${JSON.stringify(t.payload)}`).join('\n');
    try {
      const response = await this.client.chat.completions.create({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: `You are a reflective AI analyzing your own past actions. Given a sequence of actions and an outcome, write:
1. A natural-language post-mortem (2-3 sentences) explaining what happened and why.
2. A single concrete lesson learned (1 sentence).
3. Whether this was a success (true) or failure (false).
Respond in JSON: {"narrative": "...", "lesson": "...", "success": true/false}` },
          { role: 'user', content: `Actions taken:\n${trajectorySummary}\n\nOutcome: ${outcome}` },
        ],
        max_tokens: 400,
        response_format: { type: 'json_object' },
      });
      const content = response.choices[0]?.message?.content || '{}';
      return JSON.parse(content);
    } catch (err: any) {
      this.logger.warn(`Reflexion generation failed: ${err.message}`);
      return { narrative: 'Reflection unavailable.', lesson: '', success: true };
    }
  }

  private async generateMultiPerspectives(trajectory: any[], reflection: { narrative: string; lesson: string; success: boolean }): Promise<any> {
    if (!this.client) return { skeptic: 'No perspectives available.', optimizer: 'No perspectives available.' };
    const trajectorySummary = trajectory.map(t => `[${t.type}] ${JSON.stringify(t.payload)}`).join('\n');
    try {
      const response = await this.client.chat.completions.create({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: `You are a multi-perspective analysis system. Given a trajectory and reflection, analyze from two angles:
1. **Skeptic**: What could go wrong? What assumptions might be incorrect? What blind spots exist?
2. **Optimizer**: How could this be done better? What specific improvement would yield the biggest gain?
Respond in JSON: {"skeptic": "...", "optimizer": "..."}` },
          { role: 'user', content: `Trajectory:\n${trajectorySummary}\n\nReflection: ${reflection.narrative}\nLesson: ${reflection.lesson}` },
        ],
        max_tokens: 400,
        response_format: { type: 'json_object' },
      });
      const content = response.choices[0]?.message?.content || '{}';
      return JSON.parse(content);
    } catch {
      return { skeptic: 'Analysis unavailable.', optimizer: 'Analysis unavailable.' };
    }
  }

  private async extractProceduralRule(trajectory: any[], reflection: any, perspectives: any): Promise<string | null> {
    if (!this.client) return null;
    const trajectorySummary = trajectory.map(t => `[${t.type}] ${JSON.stringify(t.payload)}`).join('\n');
    try {
      const response = await this.client.chat.completions.create({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: `You extract actionable procedural rules from past experiences. Given a trajectory, outcome, and multi-perspective analysis, produce a single concrete rule that would improve future outcomes.
The rule must be:
- Specific and actionable ("When X happens, do Y")
- Grounded in the trajectory evidence
- General enough to apply to similar future situations
Respond with just the rule text, no JSON, no explanation.` },
          { role: 'user', content: `Trajectory:\n${trajectorySummary}\n\nReflection: ${reflection.narrative}\nLesson: ${reflection.lesson}\n\nSkeptic: ${perspectives?.skeptic || ''}\nOptimizer: ${perspectives?.optimizer || ''}` },
        ],
        max_tokens: 200,
      });
      return response.choices[0]?.message?.content?.trim() || null;
    } catch {
      return null;
    }
  }

  private categorizeRule(outcomeType: string): string {
    const map: Record<string, string> = {
      lead_converted: 'messaging',
      lead_lost: 'general',
      campaign_result: 'follow_up',
      booking_outcome: 'pricing',
    };
    return map[outcomeType] || 'general';
  }

  async getReflexionStats(tenantId: string) {
    const logs = await this.prisma.mikeyReflexionLog.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    const total = logs.length;
    const withRules = logs.filter(l => l.candidateRule).length;
    const byType: Record<string, number> = {};
    for (const l of logs) {
      byType[l.outcomeType] = (byType[l.outcomeType] || 0) + 1;
    }
    return { total, withRules, byType, recentLogs: logs.slice(0, 10) };
  }
}
