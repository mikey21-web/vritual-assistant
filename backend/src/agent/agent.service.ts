import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsService } from '../events/events.service';
import { TimelineService } from '../timeline/timeline.service';

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);

  constructor(
    private prisma: PrismaService,
    private events: EventsService,
    private timeline: TimelineService,
  ) {}

  async recordRunSummary(dto: { runId: string; leadId: string; actions: any[]; model: string; startedAt: string; finishedAt: string }) {
    const actionSummary = (dto.actions || []).map((a: any) =>
      `${a.tool}: ${a.status}`
    ).join(', ') || 'no actions';

    await this.timeline.add({
      type: 'agent_run_completed',
      title: `Agent run completed`,
      description: `Model: ${dto.model}. Actions: ${actionSummary}`,
      leadId: dto.leadId,
      metadata: dto as any,
    });

    await this.events.emit({
      type: 'agent.run_completed',
      leadId: dto.leadId,
      entityType: 'agent',
      entityId: dto.runId,
      payload: dto,
    });

    this.logger.log(`Run ${dto.runId} recorded for lead ${dto.leadId}: ${actionSummary}`);
    return { recorded: true, runId: dto.runId };
  }
}
