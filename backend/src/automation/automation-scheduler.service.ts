import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AutomationSchedulerService {
  private readonly logger = new Logger(AutomationSchedulerService.name);

  constructor(
    private prisma: PrismaService,
    @InjectQueue('automation-schedule') private queue: Queue,
  ) {}

  /**
   * Schedule a future action for a lead.
   * Uses dedupeKey to prevent duplicate scheduling.
   */
  async schedule(
    leadId: string,
    kind: string,
    runAt: Date,
    payload: Record<string, any> = {},
  ): Promise<void> {
    const dedupeKey = `${kind}:${leadId}:${payload.stepIndex ?? payload.hash ?? ''}`;

    const existing = await this.prisma.scheduledAction.findUnique({
      where: { dedupeKey },
    });
    if (existing && existing.status === 'pending') {
      // Already scheduled — update the time
      await this.prisma.scheduledAction.update({
        where: { id: existing.id },
        data: { runAt, status: 'pending', updatedAt: new Date() },
      });
      // Remove old job and re-enqueue
      await this.queue.remove(dedupeKey);
    } else if (existing) {
      // Superseded or done — create a new one
      await this.prisma.scheduledAction.create({
        data: { leadId, kind, runAt, payload, dedupeKey, status: 'pending' },
      });
    } else {
      await this.prisma.scheduledAction.create({
        data: { leadId, kind, runAt, payload, dedupeKey, status: 'pending' },
      });
    }

    const delay = Math.max(0, runAt.getTime() - Date.now());
    await this.queue.add(dedupeKey, { leadId, kind, dedupeKey }, {
      jobId: dedupeKey,
      delay,
      attempts: 3,
      backoff: { type: 'exponential', delay: 30000 },
    });

    this.logger.debug(`Scheduled ${kind} for lead ${leadId} at ${runAt.toISOString()}`);
  }

  /**
   * Cancel pending actions for a lead by kind.
   */
  async cancel(leadId: string, kinds: string[]): Promise<number> {
    const result = await this.prisma.scheduledAction.updateMany({
      where: {
        leadId,
        kind: { in: kinds },
        status: 'pending',
      },
      data: { status: 'cancelled' },
    });

    // Remove BullMQ jobs
    const actions = await this.prisma.scheduledAction.findMany({
      where: { leadId, kind: { in: kinds }, status: 'cancelled' },
      select: { dedupeKey: true },
    });
    for (const a of actions) {
      await this.queue.remove(a.dedupeKey);
    }

    if (result.count > 0) {
      this.logger.log(`Cancelled ${result.count} pending actions for lead ${leadId} (${kinds.join(',')})`);
    }
    return result.count;
  }
}
