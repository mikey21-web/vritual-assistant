import { Controller, Post, Get, Param, Query, Body, Logger } from '@nestjs/common';
import { MikeyService } from './mikey.service';
import { OutcomeEngineService } from './outcome-engine.service';
import { TemporalStrategyService } from './temporal-strategy.service';
import { StaffAwarenessService } from './staff-awareness.service';

@Controller('mikey')
export class MikeyController {
  private readonly logger = new Logger(MikeyController.name);

  constructor(
    private Mikey: MikeyService,
    private outcomes: OutcomeEngineService,
    private temporal: TemporalStrategyService,
    private staff: StaffAwarenessService,
  ) {}

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

