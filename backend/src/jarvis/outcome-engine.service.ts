import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsService } from '../events/events.service';

export interface OutcomeGoal {
  id: string;
  tenantId: string;
  goal: string;
  metric: string;
  target: number;
  current: number;
  status: 'active' | 'completed' | 'failed' | 'cancelled';
  steps: OutcomeStep[];
  createdAt: Date;
  updatedAt: Date;
}

export interface OutcomeStep {
  id: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  tool?: string;
  args?: any;
  result?: string;
}

@Injectable()
export class OutcomeEngineService {
  private readonly logger = new Logger(OutcomeEngineService.name);
  private activeOutcomes = new Map<string, OutcomeGoal>();

  constructor(
    private prisma: PrismaService,
    private events: EventsService,
  ) {}

  async defineOutcome(params: {
    tenantId: string;
    goal: string;
    metric: string;
    target: number;
    current: number;
  }): Promise<OutcomeGoal> {
    const steps = await this.breakDownGoal(params.goal, params.metric, params.target, params.current);

    const goal: OutcomeGoal = {
      id: `outcome_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      tenantId: params.tenantId,
      goal: params.goal,
      metric: params.metric,
      target: params.target,
      current: params.current,
      status: 'active',
      steps,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.activeOutcomes.set(goal.id, goal);

    await this.events.emit({
      type: 'jarvis.outcome_defined',
      source: 'outcome-engine',
      payload: { id: goal.id, goal: goal.goal, steps: goal.steps.map(s => s.description) },
    });

    this.logger.log(`Outcome defined: "${goal.goal}" — ${steps.length} steps`);
    return goal;
  }

  private async breakDownGoal(goal: string, metric: string, target: number, current: number): Promise<OutcomeStep[]> {
    const gap = target - current;
    const steps: OutcomeStep[] = [];

    if (metric === 'conversion_rate' || goal.toLowerCase().includes('conversion')) {
      steps.push({ id: `s1_${Date.now()}`, description: `Analyze current conversion funnel to identify bottlenecks (current: ${(current * 100).toFixed(1)}%, target: ${(target * 100).toFixed(1)}%)`, status: 'pending' });
      steps.push({ id: `s2_${Date.now()}`, description: `Review scoring rules — adjust thresholds for high-converting lead sources`, status: 'pending', tool: 'scoring_rules' });
      steps.push({ id: `s3_${Date.now()}`, description: `Identify stale leads in QUALIFYING status and re-engage them`, status: 'pending', tool: 'search_leads' });
      steps.push({ id: `s4_${Date.now()}`, description: `Optimize routing — route qualified leads to agents with best close rates`, status: 'pending', tool: 'routing_rules' });
      if (gap > 0.1) {
        steps.push({ id: `s5_${Date.now()}`, description: `Launch targeted re-engagement campaign for stalled leads`, status: 'pending', tool: 'campaigns' });
      }
    } else if (metric === 'lead_volume' || goal.toLowerCase().includes('lead')) {
      steps.push({ id: `s1_${Date.now()}`, description: `Analyze which channels bring the most qualified leads`, status: 'pending' });
      steps.push({ id: `s2_${Date.now()}`, description: `Increase spend on top-performing channels`, status: 'pending', tool: 'campaigns' });
      steps.push({ id: `s3_${Date.now()}`, description: `Review nurture sequences — optimize for conversion`, status: 'pending', tool: 'nurture_sequences' });
    } else {
      steps.push({ id: `s1_${Date.now()}`, description: `Research best practices for: ${goal}`, status: 'pending' });
      steps.push({ id: `s2_${Date.now()}`, description: `Analyze current performance (${metric}: ${current}/${target})`, status: 'pending' });
      steps.push({ id: `s3_${Date.now()}`, description: `Implement improvements and monitor results`, status: 'pending' });
    }

    return steps;
  }

  async getOutcome(id: string): Promise<OutcomeGoal | null> {
    return this.activeOutcomes.get(id) || null;
  }

  async listOutcomes(tenantId?: string): Promise<OutcomeGoal[]> {
    const outcomes = Array.from(this.activeOutcomes.values());
    return tenantId ? outcomes.filter(o => o.tenantId === tenantId) : outcomes;
  }

  async updateStep(outcomeId: string, stepId: string, status: OutcomeStep['status'], result?: string): Promise<void> {
    const outcome = this.activeOutcomes.get(outcomeId);
    if (!outcome) return;

    const step = outcome.steps.find(s => s.id === stepId);
    if (!step) return;

    step.status = status;
    if (result) step.result = result;
    outcome.updatedAt = new Date();

    const allDone = outcome.steps.every(s => s.status === 'completed');
    const anyFailed = outcome.steps.some(s => s.status === 'failed');

    if (allDone) {
      outcome.status = 'completed';
      this.logger.log(`Outcome "${outcome.goal}" completed!`);
    } else if (anyFailed) {
      outcome.status = 'failed';
      this.logger.warn(`Outcome "${outcome.goal}" failed`);
    }

    await this.events.emit({
      type: `jarvis.outcome_${outcome.status}`,
      source: 'outcome-engine',
      payload: { id: outcomeId, stepId, status, result },
    });
  }
}
