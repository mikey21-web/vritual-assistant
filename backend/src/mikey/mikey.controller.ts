import { Controller, Post, Get, Param, Query, Body, Logger } from '@nestjs/common';
import { MikeyService } from './mikey.service';
import { OutcomeEngineService } from './outcome-engine.service';
import { TemporalStrategyService } from './temporal-strategy.service';
import { StaffAwarenessService } from './staff-awareness.service';
import { EventsService } from '../events/events.service';
import { MikeySchedulerService } from './mikey-scheduler.service';
import { AutonomyGuardrailsService, AutonomyCategory, AutonomyLevel } from './autonomy-guardrails.service';
import { MetaCycleService } from './meta-cycle.service';
import { ReflexionService } from './reflexion.service';

@Controller('mikey')
export class MikeyController {
  private readonly logger = new Logger(MikeyController.name);

  constructor(
    private Mikey: MikeyService,
    private outcomes: OutcomeEngineService,
    private temporal: TemporalStrategyService,
    private staff: StaffAwarenessService,
    private events: EventsService,
    private scheduler: MikeySchedulerService,
    private guardrails: AutonomyGuardrailsService,
    private metaCycle: MetaCycleService,
    private reflexion: ReflexionService,
  ) {}

  /** Learning tab data (spec 56.5): decision/impact stats, generalized patterns, and reflexion outcome breakdown — the evidence behind "is Mikey actually helping". */
  @Get('learning')
  async getLearning(@Query('tenantId') tenantId: string) {
    const [stats, patterns, reflexionStats] = await Promise.all([
      this.metaCycle.getStats(),
      this.metaCycle.getGeneralizedPatterns(),
      this.reflexion.getReflexionStats(tenantId),
    ]);
    return { decisionStats: stats, patterns, reflexionStats };
  }

  /** Is the always-on scan loop actually alive and healthy? Surfaces a stuck or repeatedly-failing scan instead of hiding it in logs (spec invariant: every failed job becomes visible to a human). */
  @Get('health')
  async getHealth() {
    return this.scheduler.getHealth();
  }

  /** Per-category autonomy dial (spec 56.4) — the owner controls what Mikey is allowed to act on, not one global switch. */
  @Get('autonomy-policies')
  async getAutonomyPolicies(@Query('tenantId') tenantId: string) {
    return this.guardrails.getAllCategoryLevels(tenantId);
  }

  @Post('autonomy-policies/:category')
  async setAutonomyPolicy(
    @Param('category') category: AutonomyCategory,
    @Body() body: { tenantId: string; level: AutonomyLevel },
  ) {
    await this.guardrails.setCategoryLevel(body.tenantId, category, body.level);
    return this.guardrails.getAllCategoryLevels(body.tenantId);
  }

  /**
   * Everything Mikey has noticed and done, persisted (SystemEvent rows with a
   * `mikey.` type prefix) so it survives a restart and isn't limited to whatever
   * happens to be in the live socket buffer.
   */
  @Get('activity')
  async getActivity(@Query('limit') limit?: string) {
    const events = await this.events.findByTypePrefix('mikey.', limit ? parseInt(limit, 10) : 50);
    return events.map(e => ({
      id: e.id,
      type: e.type,
      severity: (e.payload as any)?.severity || 'info',
      title: (e.payload as any)?.title || e.type.replace('mikey.', '').replace(/_/g, ' '),
      description: (e.payload as any)?.description || '',
      payload: e.payload,
      createdAt: e.createdAt,
    }));
  }

  @Post('outcome')
  async defineOutcome(@Body() params: { tenantId: string; goal: string; metric: string; target: number; current: number }) {
    return this.outcomes.defineOutcome(params);
  }

  @Get('outcomes')
  async listOutcomes() {
    return this.outcomes.listOutcomes();
  }

  @Get('outcomes/:id')
  async getOutcome(@Param('id') id: string) {
    return this.outcomes.getOutcome(id);
  }

  @Post('outcomes/:id/step/:stepId')
  async updateStep(@Param('id') id: string, @Param('stepId') stepId: string, @Body() body: { status: string; result?: string }) {
    return this.outcomes.updateStep(id, stepId, body.status as any, body.result);
  }

  @Get('actions')
  async getActionRules() {
    return this.Mikey.getActionRules();
  }

  @Post('actions/run')
  async runAction(@Body() params: { leadId?: string; action: string; args: any }) {
    return this.Mikey.runAutonomousAction(params);
  }

  @Get('temporal-insights')
  async getTemporalInsights() {
    return this.temporal.getInsights();
  }

  @Post('temporal-insights/scan')
  async scanTemporalInsights() {
    return this.temporal.scan();
  }

  @Get('staff')
  async getStaffProfiles() {
    return this.staff.getProfiles();
  }

  @Post('staff/scan')
  async scanStaff() {
    return this.staff.scan();
  }

  @Get('staff/recommend-route')
  async recommendRoute(@Query('leadId') leadId?: string) {
    return this.staff.recommendRoute(leadId);
  }

  @Get('status')
  async getStatus() {
    const outcomes = await this.outcomes.listOutcomes();
    const active = outcomes.filter(o => o.status === 'active');
    const completed = outcomes.filter(o => o.status === 'completed');
    return {
      activeOutcomes: active.length,
      completedOutcomes: completed.length,
      totalOutcomes: outcomes.length,
      outcomes: outcomes.map(o => ({ id: o.id, goal: o.goal, status: o.status, steps: o.steps.length, progress: o.steps.filter(s => s.status === 'completed').length })),
    };
  }
}

