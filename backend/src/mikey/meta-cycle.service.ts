import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsService } from '../events/events.service';
import { OutcomeEngineService } from './outcome-engine.service';
import { ReflexionService } from './reflexion.service';

export interface DecisionRecord {
  id: string;
  type: 'scheduler_finding' | 'outcome_step' | 'autonomous_action' | 'routing_suggestion' | 'temporal_insight';
  action: string;
  expectedImpact: string;
  actualImpact: string | null;
  measuredAt: Date | null;
  confidence: number;
  pattern: string | null;
  status: 'pending' | 'measuring' | 'confirmed' | 'rejected';
}

export interface GeneralizedPattern {
  id: string;
  pattern: string;
  confidence: number;
  evidenceCount: number;
  firstObserved: Date;
  lastObserved: Date;
}

@Injectable()
export class MetaCycleService implements OnApplicationBootstrap {
  private readonly logger = new Logger(MetaCycleService.name);
  private decisions = new Map<string, DecisionRecord>();
  private patterns: GeneralizedPattern[] = [];
  private interval: ReturnType<typeof setInterval> | null = null;

  constructor(
    private prisma: PrismaService,
    private events: EventsService,
    private outcomeEngine: OutcomeEngineService,
    private reflexion: ReflexionService,
  ) {}

  onApplicationBootstrap(): void {
    this.logger.log('Meta-Cycle Service starting — evaluating decisions every 30 minutes');
    this.runCycleCheck();
    this.interval = setInterval(() => this.runCycleCheck(), 30 * 60 * 1000);
  }

  // ── Public API ────────────────────────────────────────────────────────

  async recordDecision(
    type: DecisionRecord['type'],
    action: string,
    expectedImpact: string,
  ): Promise<DecisionRecord> {
    const record: DecisionRecord = {
      id: `decision_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type,
      action,
      expectedImpact,
      actualImpact: null,
      measuredAt: null,
      confidence: 0.5,
      pattern: null,
      status: 'pending',
    };

    this.decisions.set(record.id, record);
    this.logger.log(`[${type}] Recorded: "${action}" — expects "${expectedImpact}"`);

    await this.events.emit({
      type: 'mikey.decision_recorded',
      source: 'meta-cycle',
      payload: {
        id: record.id,
        type: record.type,
        action: record.action,
        expectedImpact: record.expectedImpact,
        status: record.status,
      } as any,
    });

    return record;
  }

  async measureOutcome(id: string, actualImpact: string): Promise<DecisionRecord | null> {
    const record = this.decisions.get(id);
    if (!record) {
      this.logger.warn(`measureOutcome: decision ${id} not found`);
      return null;
    }

    record.actualImpact = actualImpact;
    record.measuredAt = new Date();

    const positive = this.evaluateImpact(record.expectedImpact, actualImpact);
    record.status = positive ? 'confirmed' : 'rejected';
    record.confidence = positive
      ? Math.min(1, record.confidence + 0.2)
      : Math.max(0, record.confidence - 0.15);

    this.logger.log(
      `Decision ${id.slice(0, 20)} → ${record.status} (expected: "${record.expectedImpact}", actual: "${actualImpact}")`,
    );

    await this.events.emit({
      type: `Mikey.decision_${record.status}`,
      source: 'meta-cycle',
      payload: {
        id: record.id,
        type: record.type,
        action: record.action,
        expectedImpact: record.expectedImpact,
        actualImpact,
        status: record.status,
        confidence: record.confidence,
      } as any,
    });

    return record;
  }

  async generalizePattern(): Promise<GeneralizedPattern[]> {
    const confirmed = Array.from(this.decisions.values()).filter(d => d.status === 'confirmed');
    if (confirmed.length < 2) return this.patterns;

    const discovered: GeneralizedPattern[] = [];

    // ── Group by action keyword prefix ──────────────────────────────────
    const groups = new Map<string, DecisionRecord[]>();
    for (const d of confirmed) {
      const key = d.action.replace(/:.*/, '').trim().toLowerCase();
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(d);
    }

    for (const [key, group] of groups) {
      if (group.length < 2) continue;

      const avgConfidence = group.reduce((s, d) => s + d.confidence, 0) / group.length;
      const successRate = group.filter(d => d.status === 'confirmed').length / group.length;
      const sampleImpact = group.find(d => d.actualImpact)?.actualImpact || 'positive impact';
      const patternStr = `"${key}" actions → ${sampleImpact} (${group.length} instances, ${(successRate * 100).toFixed(0)}% confirmed)`;

      if (!this.patterns.some(p => p.pattern === patternStr)) {
        const timestamps = group
          .map(d => d.measuredAt)
          .filter((t): t is Date => t !== null);
        discovered.push({
          id: `pattern_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          pattern: patternStr,
          confidence: Math.round(avgConfidence * 100) / 100,
          evidenceCount: group.length,
          firstObserved: timestamps.length ? new Date(Math.min(...timestamps.map(t => t.getTime()))) : new Date(),
          lastObserved: timestamps.length ? new Date(Math.max(...timestamps.map(t => t.getTime()))) : new Date(),
        });
      }
    }

    // ── Cross-type reliability patterns ─────────────────────────────────
    const byType = new Map<string, DecisionRecord[]>();
    for (const d of confirmed) {
      if (!byType.has(d.type)) byType.set(d.type, []);
      byType.get(d.type)!.push(d);
    }

    for (const [type, group] of byType) {
      if (group.length < 3) continue;
      const successRate = group.filter(d => d.status === 'confirmed').length / group.length;
      if (successRate < 0.5) continue;

      const patternStr =
        `${type} decisions are ${(successRate * 100).toFixed(0)}% reliable (${group.length} samples)`;

      if (!this.patterns.some(p => p.pattern === patternStr)) {
        const timestamps = group
          .map(d => d.measuredAt)
          .filter((t): t is Date => t !== null);
        discovered.push({
          id: `pattern_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          pattern: patternStr,
          confidence: Math.round(successRate * 100) / 100,
          evidenceCount: group.length,
          firstObserved: timestamps.length ? new Date(Math.min(...timestamps.map(t => t.getTime()))) : new Date(),
          lastObserved: timestamps.length ? new Date(Math.max(...timestamps.map(t => t.getTime()))) : new Date(),
        });
      }
    }

    if (discovered.length > 0) {
      this.patterns.push(...discovered);

      for (const pattern of discovered) {
        this.logger.log(`Pattern discovered: ${pattern.pattern} (confidence: ${pattern.confidence})`);

        await this.events.emit({
          type: 'mikey.pattern_discovered',
          source: 'meta-cycle',
          payload: pattern as any,
        });

        // Tag individual decisions that contributed to the pattern
        for (const d of confirmed) {
          const dKey = d.action.replace(/:.*/, '').trim().toLowerCase();
          if (pattern.pattern.startsWith(`"${dKey}"`)) {
            d.pattern = pattern.pattern;
          }
        }
      }
    }

    return this.patterns;
  }

  getGeneralizedPatterns(): GeneralizedPattern[] {
    return this.patterns;
  }

  getDecision(id: string): DecisionRecord | null {
    return this.decisions.get(id) || null;
  }

  getAllDecisions(): DecisionRecord[] {
    return Array.from(this.decisions.values());
  }

  getPendingMeasurements(): DecisionRecord[] {
    return Array.from(this.decisions.values()).filter(
      d => d.status === 'pending',
    );
  }

  getStats() {
    const all = Array.from(this.decisions.values());
    const pending = all.filter(d => d.status === 'pending' || d.status === 'measuring');
    const measuring = all.filter(d => d.status === 'measuring');
    return {
      totalDecisions: all.length,
      confirmed: all.filter(d => d.status === 'confirmed').length,
      rejected: all.filter(d => d.status === 'rejected').length,
      pending: pending.length,
      measuring: measuring.length,
      patternsFound: this.patterns.length,
    };
  }

  // ── Internal measurement helpers ──────────────────────────────────────

  private async runCycleCheck(): Promise<void> {
    try {
      const now = Date.now();
      const oneHour = 60 * 60 * 1000;

      const pending = Array.from(this.decisions.values()).filter(d => {
        if (d.status !== 'pending') return false;
        // If measuredAt is null, the decision was just created — age from creation
        const age = now - (d.measuredAt?.getTime() ?? d.measuredAt === null ? now : now);
        // Use a heuristic: if we can't determine creation time, still try to measure
        // We check if there's no measuredAt (fresh decision) — skip for first hour
        return true; // measure all pending that haven't been measured yet
      });

      // Only measure decisions that are actually old enough
      const readyToMeasure = pending.filter(d => {
        // approximate: if measuredAt is null it was just recorded, skip if recent
        // We use a different approach — decisions stay pending until measured.
        // On each cycle we measure ALL pending decisions regardless of age.
        return true;
      });

      if (readyToMeasure.length === 0) {
        this.logger.debug('Cycle check: no decisions pending measurement');
        return;
      }

      this.logger.log(`Cycle check: measuring ${readyToMeasure.length} pending decision(s)`);
      let confirmations = 0;

      for (const decision of readyToMeasure) {
        decision.status = 'measuring';
        const impact = await this.measureDecision(decision);
        if (impact !== null) {
          const updated = await this.measureOutcome(decision.id, impact);
          if (updated?.status === 'confirmed') confirmations++;
        } else {
          // Could not measure — leave as pending for next cycle
          decision.status = 'pending';
        }
      }

      if (confirmations > 0) {
        const newPatterns = await this.generalizePattern();
        this.logger.log(
          `${confirmations} new confirmation(s), ${newPatterns.length} total patterns`,
        );
      }

      // Trigger reflexion on confirmed outcomes
      const confirmedDecisions = Array.from(this.decisions.values()).filter(
        d => d.status === 'confirmed' && d.type === 'outcome_step',
      );
      for (const d of confirmedDecisions.slice(0, 3)) {
        const m = d.action.match(/^outcome_step:([a-zA-Z0-9_]+):([a-zA-Z0-9_]+):\s*(.*)/);
        if (m) {
          const outcome = await this.outcomeEngine.getOutcome(m[1]);
          if (outcome) {
            const leadId = outcome.id;
            const outcomeType = outcome.goal?.includes('convert') ? 'lead_converted' : 'lead_lost';
            this.reflexion.reflectOnOutcome('default', outcomeType, leadId).catch(() => {});
          }
        }
      }

      this.logger.log(`Cycle check complete`);
    } catch (err: any) {
      this.logger.error(`Cycle check failed: ${err.message}`);
    }
  }

  private async measureDecision(
    decision: DecisionRecord,
  ): Promise<string | null> {
    try {
      switch (decision.type) {
        case 'scheduler_finding':
          return this.measureSchedulerFinding(decision);
        case 'outcome_step':
          return this.measureOutcomeStep(decision);
        case 'autonomous_action':
          return this.measureAutonomousAction(decision);
        case 'routing_suggestion':
          return this.measureRoutingSuggestion(decision);
        case 'temporal_insight':
          return this.measureTemporalInsight(decision);
        default:
          return null;
      }
    } catch (err: any) {
      this.logger.warn(`measureDecision(${decision.id}) error: ${err.message}`);
      return null;
    }
  }

  private async measureSchedulerFinding(
    decision: DecisionRecord,
  ): Promise<string | null> {
    const action = decision.action;

    // ── Stale hot leads ─────────────────────────────────────────────────
    if (action.includes('stale_hot_leads')) {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const current = await this.prisma.lead.count({
        where: {
          segment: 'HOT',
          status: { notIn: ['CONVERTED', 'LOST', 'SPAM'] },
          updatedAt: { lt: twoHoursAgo },
          assignedAgentId: { not: null },
        },
      });
      const prev = this.extractFirstNumber(decision.expectedImpact);
      if (prev !== null && current < prev) {
        return `Stale hot leads reduced from ${prev} to ${current}`;
      }
      if (current === 0) return 'No stale hot leads remaining';
      return `Stale hot lead count: ${current}`;
    }

    // ── Stale new leads ─────────────────────────────────────────────────
    if (action.includes('stale_new_leads')) {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const current = await this.prisma.lead.count({
        where: { status: 'NEW', createdAt: { lt: oneDayAgo } },
      });
      const prev = this.extractFirstNumber(decision.expectedImpact);
      if (prev !== null && current < prev) {
        return `Stale new leads reduced from ${prev} to ${current}`;
      }
      return `Stale new lead count: ${current}`;
    }

    // ── Overdue tasks ───────────────────────────────────────────────────
    if (action.includes('overdue_tasks')) {
      const now = new Date();
      const current = await this.prisma.task.count({
        where: { dueAt: { lt: now }, status: { not: 'completed' } },
      });
      const prev = this.extractFirstNumber(decision.expectedImpact);
      if (prev !== null && current < prev) {
        return `Overdue tasks reduced from ${prev} to ${current}`;
      }
      return `Overdue task count: ${current}`;
    }

    // ── Unassigned hot leads ────────────────────────────────────────────
    if (action.includes('unassigned_hot_leads')) {
      const current = await this.prisma.lead.count({
        where: {
          segment: 'HOT',
          assignedAgentId: null,
          status: { notIn: ['CONVERTED', 'LOST', 'SPAM'] },
        },
      });
      const prev = this.extractFirstNumber(decision.expectedImpact);
      if (prev !== null && current < prev) {
        return `Unassigned hot leads reduced from ${prev} to ${current}`;
      }
      return `Unassigned hot lead count: ${current}`;
    }

    // ── Conversion anomaly ──────────────────────────────────────────────
    if (action.includes('conversion_anomaly')) {
      const todayStart = new Date(new Date().setHours(0, 0, 0, 0));
      const [todayConvs, todayLeads] = await Promise.all([
        this.prisma.lead.count({
          where: { status: 'CONVERTED', updatedAt: { gte: todayStart } },
        }),
        this.prisma.lead.count({
          where: { createdAt: { gte: todayStart } },
        }),
      ]);
      const rate = todayLeads > 0 ? (todayConvs / todayLeads) * 100 : 0;
      return `Today conversion: ${rate.toFixed(1)}% (${todayConvs}/${todayLeads})`;
    }

    // ── Lead source shift ───────────────────────────────────────────────
    if (action.includes('lead_source_shift')) {
      const todayStart = new Date(new Date().setHours(0, 0, 0, 0));
      const sevenDaysAgo = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
      const sources = await this.prisma.lead.groupBy({
        by: ['source'],
        where: { createdAt: { gte: sevenDaysAgo } },
        _count: { id: true },
      });
      if (sources.length === 0) return 'No lead data available';
      const total = sources.reduce((s, g) => s + g._count.id, 0);
      const top = sources.reduce((b, g) => (g._count.id > (b?._count.id || 0) ? g : b), sources[0]);
      return `Top source: ${top.source} ${((top._count.id / total) * 100).toFixed(0)}% (${top._count.id}/${total})`;
    }

    return null;
  }

  private async measureOutcomeStep(
    decision: DecisionRecord,
  ): Promise<string | null> {
    const m = decision.action.match(
      /^outcome_step:([a-zA-Z0-9_]+):([a-zA-Z0-9_]+):\s*(.*)/,
    );
    if (!m) return null;

    const [, outcomeId, stepId] = m;
    const outcome = await this.outcomeEngine.getOutcome(outcomeId);
    if (!outcome) return `Outcome ${outcomeId} no longer tracked`;

    const step = outcome.steps.find(s => s.id === stepId);
    if (!step) return `Step ${stepId} not found in outcome`;

    if (step.status === 'completed') {
      return `Step completed${step.result ? `: ${step.result}` : ''}`;
    }
    if (step.status === 'failed') {
      return `Step failed${step.result ? `: ${step.result}` : ''}`;
    }
    return `Step still ${step.status}`;
  }

  private async measureAutonomousAction(
    decision: DecisionRecord,
  ): Promise<string | null> {
    const events = await this.events.findByType('mikey.autonomous_action', 20);
    const matching = events.find(e => {
      if (!e.payload || typeof e.payload !== 'object') return false;
      return (e.payload as any).action === decision.action;
    });
    if (!matching) return 'No autonomous-action event found yet';

    const payload = matching.payload as any;
    const result = payload.result;
    if (payload.success === false) {
      return `Action failed: ${result || 'unknown error'}`;
    }
    return `Action succeeded: ${result ? JSON.stringify(result).slice(0, 160) : 'completed'}`;
  }

  private async measureRoutingSuggestion(
    decision: DecisionRecord,
  ): Promise<string | null> {
    const todayStart = new Date(new Date().setHours(0, 0, 0, 0));
    const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);

    const [todayConvs, todayTotal, yestConvs, yestTotal] = await Promise.all([
      this.prisma.lead.count({
        where: { status: 'CONVERTED', updatedAt: { gte: todayStart } },
      }),
      this.prisma.lead.count({
        where: { updatedAt: { gte: todayStart }, status: { notIn: ['NEW'] } },
      }),
      this.prisma.lead.count({
        where: {
          status: 'CONVERTED',
          updatedAt: { gte: yesterdayStart, lt: todayStart },
        },
      }),
      this.prisma.lead.count({
        where: {
          updatedAt: { gte: yesterdayStart, lt: todayStart },
          status: { notIn: ['NEW'] },
        },
      }),
    ]);

    const todayRate = todayTotal > 0 ? todayConvs / todayTotal : 0;
    const yestRate = yestTotal > 0 ? yestConvs / yestTotal : 0;

    if (todayRate > yestRate) {
      return `Conversion improved: ${(yestRate * 100).toFixed(1)}% → ${(todayRate * 100).toFixed(1)}%`;
    }
    return `Conversion: ${(todayRate * 100).toFixed(1)}% vs yesterday ${(yestRate * 100).toFixed(1)}%`;
  }

  private async measureTemporalInsight(
    decision: DecisionRecord,
  ): Promise<string | null> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const leads = await this.prisma.lead.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { status: true },
    });
    if (leads.length < 20) return 'Insufficient data to validate temporal pattern';
    const baseline = leads.filter(l => l.status === 'CONVERTED').length / leads.length;
    return `Baseline conversion: ${(baseline * 100).toFixed(1)}% (${leads.length} leads over 30 days)`;
  }

  // ── Utility ───────────────────────────────────────────────────────────

  private evaluateImpact(expected: string, actual: string): boolean {
    const e = expected.toLowerCase().trim();
    const a = actual.toLowerCase().trim();

    // Direct match or containment
    if (a.includes(e) || e.includes(a)) return true;

    // Numeric improvement detection
    const hasReduction =
      e.includes('reduc') || e.includes('decreas') || e.includes('fewer') || e.includes('lower');
    const hasIncrease =
      e.includes('increas') || e.includes('improv') || e.includes('higher') || e.includes('more');
    const actualPositive =
      a.includes('reduc') ||
      a.includes('improv') ||
      a.includes('succeed') ||
      a.includes('complet') ||
      a.includes('resolv');

    if ((hasReduction || hasIncrease) && actualPositive) return true;

    // Check for positive signal
    const positive = ['complet', 'improv', 'success', 'reduc', 'increase', 'achieved', 'done', 'resolv', 'no.*remaining'];
    if (positive.some(p => new RegExp(p).test(a))) return true;

    return false;
  }

  private extractFirstNumber(text: string): number | null {
    const m = text.match(/\d+/);
    return m ? parseInt(m[0], 10) : null;
  }
}

