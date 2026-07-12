import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AutomationSchedulerService } from './automation-scheduler.service';
import { TasksService } from '../tasks/tasks.service';

const QUIET_AFTER_MS = 24 * 60 * 60 * 1000; // re-engage a lead 24h after we last messaged them with no reply
const HOT_UNASSIGNED_AFTER_MS = 4 * 60 * 60 * 1000; // alert on a hot lead unassigned for 4h+
const SWEEP_BATCH_SIZE = 200;
const HOT_LEAD_TASK_MARKER = 'Hot lead unassigned';

@Processor('proactive-sweep')
export class ProactiveSweepProcessor extends WorkerHost {
  private readonly logger = new Logger(ProactiveSweepProcessor.name);

  constructor(
    private prisma: PrismaService,
    private scheduler: AutomationSchedulerService,
    private tasks: TasksService,
  ) {
    super();
  }

  async process(_job: Job): Promise<any> {
    const [reEngaged, alerted] = await Promise.all([
      this.reEngageQuietLeads(),
      this.alertOnUnassignedHotLeads(),
    ]);
    if (reEngaged > 0 || alerted > 0) {
      this.logger.log(`Proactive sweep: scheduled ${reEngaged} re-engage run(s), created ${alerted} hot-lead alert(s)`);
    }
    return { reEngaged, alerted };
  }

  // Leads we messaged last (they went quiet) get exactly one automatic
  // re-engage attempt, gated by consent and never repeated for the same lead.
  private async reEngageQuietLeads(): Promise<number> {
    const cutoff = new Date(Date.now() - QUIET_AFTER_MS);

    const candidates = await this.prisma.lead.findMany({
      where: {
        status: { notIn: ['LOST', 'CONVERTED', 'SPAM'] },
        contact: { consentStatus: { not: 'opted_out' } },
      },
      include: {
        conversations: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      take: SWEEP_BATCH_SIZE,
      orderBy: { createdAt: 'asc' },
    });

    let scheduled = 0;
    for (const lead of candidates) {
      const lastMessage = lead.conversations[0];
      if (!lastMessage || lastMessage.direction !== 'OUTBOUND' || lastMessage.createdAt > cutoff) continue;

      const alreadyTried = await this.prisma.scheduledAction.findFirst({ where: { leadId: lead.id, kind: 're_engage' } });
      if (alreadyTried) continue;

      await this.scheduler.schedule(lead.id, 're_engage', new Date());
      scheduled++;
    }
    return scheduled;
  }

  // Not lead-facing outreach — a hot, unassigned lead sitting untouched is
  // an internal problem that needs a human, not another AI message.
  private async alertOnUnassignedHotLeads(): Promise<number> {
    const cutoff = new Date(Date.now() - HOT_UNASSIGNED_AFTER_MS);

    const candidates = await this.prisma.lead.findMany({
      where: {
        segment: 'HOT',
        status: { notIn: ['LOST', 'CONVERTED', 'SPAM'] },
        assignedAgentId: null,
        createdAt: { lt: cutoff },
      },
      take: SWEEP_BATCH_SIZE,
    });

    let created = 0;
    for (const lead of candidates) {
      const existing = await this.prisma.task.findFirst({ where: { leadId: lead.id, title: { contains: HOT_LEAD_TASK_MARKER } } });
      if (existing) continue;

      await this.tasks.create({
        leadId: lead.id,
        title: `${HOT_LEAD_TASK_MARKER}: needs a human`,
        description: `This lead has been scored HOT and unassigned for over ${HOT_UNASSIGNED_AFTER_MS / 3600000} hours.`,
        priority: 'high',
      });
      created++;
    }
    return created;
  }
}
