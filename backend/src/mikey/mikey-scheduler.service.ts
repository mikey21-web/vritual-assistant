import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsService } from '../events/events.service';
import { TemporalStrategyService } from './temporal-strategy.service';
import { StaffAwarenessService } from './staff-awareness.service';
import { MetaCycleService } from './meta-cycle.service';
import { NicheScannerService } from './niche-scanner.service';
import { NicheActionService } from './niche-action.service';
import { ReflexionService } from './reflexion.service';
import { FederatedService } from './federated.service';
import { BookingLifecycleService } from '../bookings/booking-lifecycle.service';
import { MorningDigestService } from './morning-digest.service';
import { SalienceEngineService } from './salience-engine.service';
import type { SchedulerFinding } from './mikey-scheduler.types';

@Injectable()
export class MikeySchedulerService implements OnApplicationBootstrap {
  private readonly logger = new Logger(MikeySchedulerService.name);
  private interval: ReturnType<typeof setInterval> | null = null;
  private lastFindings: SchedulerFinding[] = [];

  constructor(
    private prisma: PrismaService,
    private events: EventsService,
    private temporal: TemporalStrategyService,
    private staff: StaffAwarenessService,
    private metaCycle: MetaCycleService,
    private nicheScanner: NicheScannerService,
    private nicheAction: NicheActionService,
    private reflexion: ReflexionService,
    private federated: FederatedService,
    private bookingLifecycle: BookingLifecycleService,
    private morningDigest: MorningDigestService,
    private salienceEngine: SalienceEngineService,
  ) {}

  onApplicationBootstrap(): void {
    this.logger.log('Mikey Scheduler starting — scanning every 5 minutes');
    this.scan();
    this.interval = setInterval(() => this.scan(), 5 * 60 * 1000);
    this.runDailyJobs();
    this.scheduleMorningDigest();
  }

  /** Mikey speaks first: an 8am brief to every owner/admin, unprompted. */
  private scheduleMorningDigest(): void {
    const msUntil8am = () => {
      const now = new Date();
      const next = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 0, 0);
      if (next <= now) next.setDate(next.getDate() + 1);
      return next.getTime() - now.getTime();
    };
    const run = () => this.morningDigest.sendDailyDigests().catch(err => this.logger.error(`Morning digest failed: ${err.message}`));
    setTimeout(() => {
      run();
      setInterval(run, 24 * 60 * 60 * 1000);
    }, msUntil8am());
  }

  private async runDailyJobs(): Promise<void> {
    const msUntilMidnight = () => {
      const now = new Date();
      const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 15, 0);
      return midnight.getTime() - now.getTime();
    };
    setTimeout(async () => {
      this.logger.log('Running daily peak Mikey jobs');
      await this.runReflexionOnRecentOutcomes();
      await this.pushFederatedAggregates();
      setInterval(async () => {
        await this.runReflexionOnRecentOutcomes();
        await this.pushFederatedAggregates();
      }, 24 * 60 * 60 * 1000);
    }, msUntilMidnight());
  }

  private async scan(): Promise<void> {
    try {
      const findings: SchedulerFinding[] = [];
      const [staleHot, staleNew, overdue, unassigned] = await Promise.all([
        this.checkStaleHotLeads(),
        this.checkStaleNewLeads(),
        this.checkOverdueTasks(),
        this.checkUnassignedHotLeads(),
      ]);
      findings.push(...staleHot, ...staleNew, ...overdue, ...unassigned);

      // Triage core: hand the two findings with an unambiguous, safe remedy
      // straight to the salience engine so Mikey acts on them without being
      // asked, instead of just logging that they exist.
      for (const finding of [...staleHot, ...unassigned]) {
        try {
          const outcome = await this.salienceEngine.route(finding);
          if (outcome.acted) this.logger.log(`Salience engine acted: ${outcome.summary}`);
        } catch (err: any) {
          this.logger.error(`Salience engine failed for ${finding.type}: ${err.message}`);
        }
      }

      const [conversionAnomaly, sourceShift] = await Promise.all([
        this.checkConversionAnomaly(),
        this.checkLeadSourceShift(),
      ]);
      findings.push(...conversionAnomaly, ...sourceShift);

      // Detect site-visit / appointment no-shows and queue reschedule nudges.
      try {
        await this.bookingLifecycle.scanNoShows();
      } catch (err: any) {
        this.logger.error(`No-show scan failed: ${err.message}`);
      }

      // Flag overdue payment milestones and queue collection nudges.
      try {
        await this.bookingLifecycle.scanOverduePayments();
      } catch (err: any) {
        this.logger.error(`Overdue-payment scan failed: ${err.message}`);
      }

      if (new Date().getMinutes() % 15 === 0) {
        const nicheFindings = await this.nicheScanner.scanAll();
        for (const nf of nicheFindings) {
          findings.push(nf as any);
        }
      }

      const temporalInsights = await this.temporal.scan();
      if (temporalInsights.length > 0) {
        findings.push({
          type: 'conversion_anomaly',
          severity: 'warning',
          title: 'Temporal conversion pattern detected',
          description: temporalInsights[0].recommendation,
          count: temporalInsights.length,
          metadata: { insights: temporalInsights.slice(0, 3) },
        });

        // Record temporal insights in the meta-cycle for follow-up measurement
        for (const insight of temporalInsights) {
          await this.metaCycle.recordDecision(
            'temporal_insight',
            `temporal: ${insight.type}${insight.source !== 'all' ? ` source=${insight.source}` : ''}`,
            insight.recommendation.slice(0, 180),
          );
        }
      }

      if (new Date().getMinutes() % 15 === 0) {
        const staffProfiles = await this.staff.scan();
        if (staffProfiles.length > 0) {
          const topPerformer = staffProfiles.reduce((best, p) => p.conversionRate > (best?.conversionRate || 0) ? p : best, staffProfiles[0]);
          findings.push({
            type: 'staff_performance_update',
            severity: 'info',
            title: 'Staff performance scan',
            description: `${staffProfiles.length} active agents. Top: ${topPerformer.name} at ${(topPerformer.conversionRate * 100).toFixed(0)}% conversion.`,
            count: staffProfiles.length,
            metadata: { agents: staffProfiles.map(p => ({ name: p.name, rate: p.conversionRate, leads: p.totalLeadsHandled })) },
          });
        }
      }

      const newFindings = findings.filter(f => {
        const prev = this.lastFindings.find(p => p.type === f.type);
        return !prev || prev.count !== f.count || prev.severity !== f.severity;
      });

      for (const finding of newFindings) {
        await this.events.emit({
          type: `mikey.${finding.type}`,
          source: 'mikey-scheduler',
          payload: finding as any,
        });

        // Track every scheduler finding as a decision in the meta-cycle
        await this.metaCycle.recordDecision(
          'scheduler_finding',
          `${finding.type}: ${finding.title}`,
          finding.description,
        );

        this.logger.warn(`[${finding.severity}] ${finding.title}: ${finding.description}`);

        if (finding.severity === 'info') {
          const result = await this.nicheAction.execute(finding);
          if (result.executed) {
            this.logger.log(`Auto-executed action for ${finding.type}: ${result.result}`);
          }
        }
      }

      this.lastFindings = findings;
    } catch (err: any) {
      this.logger.error(`Scheduler scan failed: ${err.message}`);
    }
  }

  private async checkStaleHotLeads(): Promise<SchedulerFinding[]> {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const stale = await this.prisma.lead.findMany({
      where: {
        segment: 'HOT',
        status: { notIn: ['CONVERTED', 'LOST', 'SPAM'] },
        updatedAt: { lt: twoHoursAgo },
        assignedAgentId: { not: null },
      },
      include: { assignedAgent: true, contact: true },
      take: 10,
    });
    if (stale.length === 0) return [];
    return [{
      type: 'stale_hot_leads',
      severity: stale.length > 5 ? 'critical' : 'warning',
      title: `Hot leads untouched`,
      description: `${stale.length} hot lead(s) haven't been contacted in over 2 hours. ${stale.slice(0, 3).map(l => l.contact?.name || 'Unknown').join(', ')}${stale.length > 3 ? ` and ${stale.length - 3} more` : ''}`,
      count: stale.length,
      metadata: { leadIds: stale.map(l => l.id) },
    }];
  }

  private async checkStaleNewLeads(): Promise<SchedulerFinding[]> {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const stale = await this.prisma.lead.findMany({
      where: { status: 'NEW', createdAt: { lt: oneDayAgo } },
      include: { contact: true },
      take: 10,
    });
    if (stale.length === 0) return [];
    return [{
      type: 'stale_new_leads',
      severity: stale.length > 10 ? 'critical' : 'warning',
      title: `New leads not contacted`,
      description: `${stale.length} lead(s) still in NEW status for over 24 hours. ${stale.slice(0, 3).map(l => l.contact?.name || 'Unknown').join(', ')}${stale.length > 3 ? ` and ${stale.length - 3} more` : ''}`,
      count: stale.length,
      metadata: { leadIds: stale.map(l => l.id) },
    }];
  }

  private async checkOverdueTasks(): Promise<SchedulerFinding[]> {
    const now = new Date();
    const overdue = await this.prisma.task.findMany({
      where: { dueAt: { lt: now }, status: { not: 'completed' } },
      include: { lead: { include: { contact: true } } },
      take: 10,
    });
    if (overdue.length === 0) return [];
    return [{
      type: 'overdue_tasks',
      severity: overdue.length > 5 ? 'critical' : 'warning',
      title: `Overdue tasks`,
      description: `${overdue.length} task(s) past due. ${overdue.slice(0, 3).map(t => t.title.slice(0, 40)).join(', ')}${overdue.length > 3 ? ` and ${overdue.length - 3} more` : ''}`,
      count: overdue.length,
      metadata: { taskIds: overdue.map(t => t.id) },
    }];
  }

  private async checkUnassignedHotLeads(): Promise<SchedulerFinding[]> {
    const unassigned = await this.prisma.lead.findMany({
      where: { segment: 'HOT', assignedAgentId: null, status: { notIn: ['CONVERTED', 'LOST', 'SPAM'] } },
      include: { contact: true },
      take: 10,
    });
    if (unassigned.length === 0) return [];
    return [{
      type: 'unassigned_hot_leads',
      severity: 'critical',
      title: `Unassigned hot leads`,
      description: `${unassigned.length} hot lead(s) have no assigned agent. ${unassigned.slice(0, 3).map(l => l.contact?.name || 'Unknown').join(', ')}${unassigned.length > 3 ? ` and ${unassigned.length - 3} more` : ''}`,
      count: unassigned.length,
      metadata: { leadIds: unassigned.map(l => l.id) },
    }];
  }

  private async checkConversionAnomaly(): Promise<SchedulerFinding[]> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [todayConversions, weekConversions, todayLeads, weekLeads] = await Promise.all([
      this.prisma.lead.count({ where: { status: 'CONVERTED', updatedAt: { gte: todayStart } } }),
      this.prisma.lead.count({ where: { status: 'CONVERTED', updatedAt: { gte: sevenDaysAgo, lt: todayStart } } }),
      this.prisma.lead.count({ where: { createdAt: { gte: todayStart } } }),
      this.prisma.lead.count({ where: { createdAt: { gte: sevenDaysAgo, lt: todayStart } } }),
    ]);

    const todayRate = todayLeads > 0 ? todayConversions / todayLeads : 0;
    const weekRate = weekLeads > 0 ? weekConversions / weekLeads : 0;
    const drop = weekRate > 0 ? ((todayRate - weekRate) / weekRate) * 100 : 0;

    if (Math.abs(drop) < 10) return [];
    return [{
      type: 'conversion_anomaly',
      severity: drop < -20 ? 'critical' : 'warning',
      title: `Conversion rate ${drop > 0 ? 'up' : 'down'} ${Math.abs(drop).toFixed(1)}%`,
      description: `Today's conversion rate (${(todayRate * 100).toFixed(1)}%) vs 7-day average (${(weekRate * 100).toFixed(1)}%). ${drop > 0 ? 'Upward trend' : 'Investigation recommended'}.`,
      count: Math.abs(Math.round(drop)),
      metadata: { todayRate, weekRate, drop },
    }];
  }

  // ── P4: Reflexion on recent outcomes ──────────────────────────────────
  private async runReflexionOnRecentOutcomes(): Promise<void> {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const [converted, lost] = await Promise.all([
        this.prisma.lead.findMany({
          where: { status: 'CONVERTED', updatedAt: { gte: oneHourAgo } },
          select: { id: true, tenantId: true },
          take: 10,
        }),
        this.prisma.lead.findMany({
          where: { status: 'LOST', updatedAt: { gte: oneHourAgo } },
          select: { id: true, tenantId: true },
          take: 10,
        }),
      ]);

      for (const lead of converted) {
        try {
          await this.reflexion.reflectOnOutcome(lead.tenantId, 'lead_converted', lead.id);
          this.logger.log(`Reflexion: lead_converted ${lead.id}`);
        } catch (err: any) {
          this.logger.warn(`Reflexion failed for lead_converted ${lead.id}: ${err.message}`);
        }
      }
      for (const lead of lost) {
        try {
          await this.reflexion.reflectOnOutcome(lead.tenantId, 'lead_lost', lead.id);
          this.logger.log(`Reflexion: lead_lost ${lead.id}`);
        } catch (err: any) {
          this.logger.warn(`Reflexion failed for lead_lost ${lead.id}: ${err.message}`);
        }
      }

      if (converted.length > 0 || lost.length > 0) {
        await this.events.emit({
          type: 'mikey.reflexion_completed',
          source: 'mikey-scheduler',
          payload: { converted: converted.length, lost: lost.length },
        });
      }
    } catch (err: any) {
      this.logger.error(`Reflexion scan failed: ${err.message}`);
    }
  }

  // ── P5: Federated push ────────────────────────────────────────────────
  private async pushFederatedAggregates(): Promise<void> {
    try {
      const tenants = await this.prisma.tenant.findMany({
        where: { active: true },
        select: { id: true },
      });
      let pushed = 0;
      for (const t of tenants) {
        const ok = await this.federated.pushToAggregator(t.id);
        if (ok) pushed++;
      }
      this.logger.log(`Federated: pushed aggregates for ${pushed}/${tenants.length} active tenants`);
      await this.events.emit({
        type: 'mikey.federated_push_completed',
        source: 'mikey-scheduler',
        payload: { pushed, total: tenants.length },
      });
    } catch (err: any) {
      this.logger.error(`Federated push failed: ${err.message}`);
    }
  }

  private async checkLeadSourceShift(): Promise<SchedulerFinding[]> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);

    const sources = await this.prisma.lead.groupBy({
      by: ['source'],
      where: { createdAt: { gte: sevenDaysAgo } },
      _count: { id: true },
    });

    const total = sources.reduce((s, g) => s + g._count.id, 0);
    if (total === 0) return [];

    const topSource = sources.reduce((best, g) => g._count.id > (best?._count.id || 0) ? g : best, sources[0]);
    const topPercent = (topSource._count.id / total) * 100;

    if (topPercent < 30) return [];
    return [{
      type: 'lead_source_shift',
      severity: 'info',
      title: `Lead source concentration`,
      description: `${topSource.source} accounts for ${topPercent.toFixed(0)}% of leads this week (${topSource._count.id}/${total}). ${topPercent > 60 ? 'High dependency — consider diversifying.' : 'Healthy distribution with a strong channel.'}`,
      count: topSource._count.id,
      metadata: { source: topSource.source, percent: topPercent, total },
    }];
  }
}

