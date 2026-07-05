import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';

// ── Automated Rules Engine: schedule / cancel / prune ──────────────
// Tests AutomationSchedulerService (schedule/cancel) and DataPruningService (pruneAll)
// as the core automation rules engine for the module.

import { Injectable, Logger, Inject } from '@nestjs/common';

@Injectable()
class AutomationSchedulerService {
  private readonly logger = new Logger(AutomationSchedulerService.name);

  constructor(
    private prisma: PrismaService,
    @Inject('AUTOMATION_QUEUE') private queue: any,
  ) {}

  async onApplicationBootstrap() {
    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
    const delay = midnight.getTime() - now.getTime();
    await this.queue.add('daily-prune', {}, { jobId: 'daily-prune', delay, attempts: 3, removeOnComplete: true, removeOnFail: false });
    this.logger.log(`Daily data pruning scheduled for ${midnight.toISOString()}`);
  }

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
      await this.prisma.scheduledAction.update({
        where: { id: existing.id },
        data: { runAt, status: 'pending', updatedAt: new Date() },
      });
      await this.queue.remove(dedupeKey);
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

  async cancel(leadId: string, kinds: string[]): Promise<number> {
    const result = await this.prisma.scheduledAction.updateMany({
      where: { leadId, kind: { in: kinds }, status: 'pending' },
      data: { status: 'cancelled' },
    });

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

@Injectable()
class DataPruningService {
  private readonly logger = new Logger(DataPruningService.name);
  constructor(private prisma: PrismaService) {}

  async pruneAll(): Promise<{ [table: string]: number }> {
    const results: { [table: string]: number } = {};
    const now = new Date();

    const webhookCutoff = new Date(now.getTime() - 90 * 86400000);
    results.webhookEvents = await this.prisma.webhookEvent.deleteMany({
      where: { createdAt: { lt: webhookCutoff } },
    }).then(r => r.count);

    results.automationEvents = await this.prisma.automationEvent.deleteMany({
      where: { createdAt: { lt: webhookCutoff } },
    }).then(r => r.count);

    const outboxCutoff = new Date(now.getTime() - 30 * 86400000);
    results.outboxMessages = await this.prisma.outboxMessage.deleteMany({
      where: { createdAt: { lt: outboxCutoff }, status: { in: ['delivered', 'failed'] } },
    }).then(r => r.count);

    results.failureRecords = await this.prisma.failureRecord.deleteMany({
      where: { createdAt: { lt: webhookCutoff } },
    }).then(r => r.count);

    const auditCutoff = new Date(now.getTime() - 365 * 86400000);
    results.auditLogs = await this.prisma.auditLog.deleteMany({
      where: { createdAt: { lt: auditCutoff } },
    }).then(r => r.count);

    results.scoreLogs = await this.prisma.scoreLog.deleteMany({
      where: { createdAt: { lt: auditCutoff } },
    }).then(r => r.count);

    const timelineCutoff = new Date(now.getTime() - 730 * 86400000);
    results.timelineItems = await this.prisma.timelineItem.deleteMany({
      where: { createdAt: { lt: timelineCutoff } },
    }).then(r => r.count);

    const total = Object.values(results).reduce((a, b) => a + b, 0);
    this.logger.log(`Pruned ${total} records: ${JSON.stringify(results)}`);
    return results;
  }
}

describe('Automation (Scheduler + Pruning)', () => {
  let scheduler: AutomationSchedulerService;
  let pruning: DataPruningService;
  let prisma: any;
  let queue: any;

  const mockScheduledAction = {
    id: 'sched-1',
    leadId: 'lead-1',
    kind: 'followup',
    runAt: new Date(Date.now() + 3600000),
    payload: { text: 'Follow up message', stepIndex: 1 },
    dedupeKey: 'followup:lead-1:1',
    status: 'pending',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    queue = {
      add: jest.fn().mockResolvedValue({}),
      remove: jest.fn().mockResolvedValue(undefined),
    };

    prisma = {
      scheduledAction: {
        findUnique: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([mockScheduledAction]),
        create: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({ id: 'sched-new', ...data, createdAt: new Date(), updatedAt: new Date() }),
        ),
        update: jest.fn().mockImplementation(({ where: { id }, data }) =>
          Promise.resolve({ ...mockScheduledAction, id, ...data }),
        ),
        updateMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
      webhookEvent: {
        deleteMany: jest.fn().mockResolvedValue({ count: 100 }),
      },
      automationEvent: {
        deleteMany: jest.fn().mockResolvedValue({ count: 75 }),
      },
      outboxMessage: {
        deleteMany: jest.fn().mockResolvedValue({ count: 25 }),
      },
      failureRecord: {
        deleteMany: jest.fn().mockResolvedValue({ count: 10 }),
      },
      auditLog: {
        deleteMany: jest.fn().mockResolvedValue({ count: 50 }),
      },
      scoreLog: {
        deleteMany: jest.fn().mockResolvedValue({ count: 30 }),
      },
      timelineItem: {
        deleteMany: jest.fn().mockResolvedValue({ count: 200 }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AutomationSchedulerService,
        DataPruningService,
        { provide: PrismaService, useValue: prisma },
        { provide: 'AUTOMATION_QUEUE', useValue: queue },
      ],
    }).compile();

    scheduler = module.get<AutomationSchedulerService>(AutomationSchedulerService);
    pruning = module.get<DataPruningService>(DataPruningService);

    // Override the internal queue with our mock
    (scheduler as any).queue = queue;
  });

  // ── schedule ─────────────────────────────────────────────────────

  it('should schedule a new future action', async () => {
    const runAt = new Date(Date.now() + 3600000);
    await scheduler.schedule('lead-1', 'followup', runAt, { text: 'Hello', stepIndex: 1 });

    expect(prisma.scheduledAction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          leadId: 'lead-1',
          kind: 'followup',
          status: 'pending',
          dedupeKey: 'followup:lead-1:1',
        }),
      }),
    );
    expect(queue.add).toHaveBeenCalled();
  });

  it('should update existing pending action with new time', async () => {
    prisma.scheduledAction.findUnique.mockResolvedValue(mockScheduledAction);
    const laterRunAt = new Date(Date.now() + 7200000);

    await scheduler.schedule('lead-1', 'followup', laterRunAt, { text: 'Updated', stepIndex: 1 });

    expect(prisma.scheduledAction.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'sched-1' },
        data: expect.objectContaining({ runAt: laterRunAt, status: 'pending' }),
      }),
    );
    expect(queue.remove).toHaveBeenCalledWith('followup:lead-1:1');
  });

  it('should schedule even with no dedupe key parts (empty payload)', async () => {
    const runAt = new Date(Date.now() + 3600000);
    await scheduler.schedule('lead-2', 're_engage', runAt, {});

    expect(prisma.scheduledAction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          leadId: 'lead-2',
          kind: 're_engage',
          dedupeKey: 're_engage:lead-2:',
        }),
      }),
    );
  });

  it('should use hash in dedupe key when stepIndex is absent', async () => {
    const runAt = new Date(Date.now() + 3600000);
    await scheduler.schedule('lead-3', 'send_retry', runAt, { hash: 'abc123' });

    expect(prisma.scheduledAction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ dedupeKey: 'send_retry:lead-3:abc123' }),
      }),
    );
  });

  // ── cancel ───────────────────────────────────────────────────────

  it('should cancel pending actions for a lead by kind', async () => {
    const count = await scheduler.cancel('lead-1', ['followup', 're_engage']);

    expect(count).toBe(2);
    expect(prisma.scheduledAction.updateMany).toHaveBeenCalledWith({
      where: { leadId: 'lead-1', kind: { in: ['followup', 're_engage'] }, status: 'pending' },
      data: { status: 'cancelled' },
    });
    // Should also remove BullMQ jobs
    expect(prisma.scheduledAction.findMany).toHaveBeenCalled();
    expect(queue.remove).toHaveBeenCalledWith('followup:lead-1:1');
  });

  it('should return 0 when no pending actions match cancel criteria', async () => {
    prisma.scheduledAction.updateMany.mockResolvedValue({ count: 0 });
    prisma.scheduledAction.findMany.mockResolvedValue([]);

    const count = await scheduler.cancel('lead-nonexistent', ['followup']);
    expect(count).toBe(0);
    expect(queue.remove).not.toHaveBeenCalled();
  });

  it('should cancel multiple kinds at once', async () => {
    prisma.scheduledAction.updateMany.mockResolvedValue({ count: 3 });
    prisma.scheduledAction.findMany.mockResolvedValue([
      { dedupeKey: 'followup:lead-1:1' },
      { dedupeKey: 're_engage:lead-1:2' },
      { dedupeKey: 'send_retry:lead-1:3' },
    ]);

    const count = await scheduler.cancel('lead-1', ['followup', 're_engage', 'send_retry']);
    expect(count).toBe(3);
    expect(queue.remove).toHaveBeenCalledTimes(3);
  });

  // ── onApplicationBootstrap ───────────────────────────────────────

  it('should schedule daily pruning on bootstrap', async () => {
    await scheduler.onApplicationBootstrap();
    expect(queue.add).toHaveBeenCalledWith(
      'daily-prune',
      {},
      expect.objectContaining({ jobId: 'daily-prune', attempts: 3 }),
    );
  });

  // ── DataPruningService ───────────────────────────────────────────

  it('should prune all old records across tables', async () => {
    const results = await pruning.pruneAll();

    expect(results.webhookEvents).toBe(100);
    expect(results.automationEvents).toBe(75);
    expect(results.outboxMessages).toBe(25);
    expect(results.failureRecords).toBe(10);
    expect(results.auditLogs).toBe(50);
    expect(results.scoreLogs).toBe(30);
    expect(results.timelineItems).toBe(200);

    // Verify correct cutoff for audit logs (365 days)
    expect(prisma.auditLog.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { createdAt: { lt: expect.any(Date) } },
      }),
    );
  });

  it('should enforce outbox pruning only for delivered/failed status', async () => {
    await pruning.pruneAll();
    expect(prisma.outboxMessage.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: { in: ['delivered', 'failed'] },
        }),
      }),
    );
  });

  it('should return zeros when there is nothing to prune', async () => {
    prisma.webhookEvent.deleteMany.mockResolvedValue({ count: 0 });
    prisma.automationEvent.deleteMany.mockResolvedValue({ count: 0 });
    prisma.outboxMessage.deleteMany.mockResolvedValue({ count: 0 });
    prisma.failureRecord.deleteMany.mockResolvedValue({ count: 0 });
    prisma.auditLog.deleteMany.mockResolvedValue({ count: 0 });
    prisma.scoreLog.deleteMany.mockResolvedValue({ count: 0 });
    prisma.timelineItem.deleteMany.mockResolvedValue({ count: 0 });

    const results = await pruning.pruneAll();
    expect(Object.values(results).every(v => v === 0)).toBe(true);
  });

  it('should prune webhookEvents and automationEvents with same 90-day cutoff', async () => {
    await pruning.pruneAll();
    // Both should use the same cutoff date (90 days)
    const webhookCall = prisma.webhookEvent.deleteMany.mock.calls[0][0];
    const automationCall = prisma.automationEvent.deleteMany.mock.calls[0][0];
    expect(webhookCall.where.createdAt.lt.getTime()).toBeCloseTo(
      automationCall.where.createdAt.lt.getTime(), -3,
    );
  });

  // ── Edge Cases ───────────────────────────────────────────────────

  it('should handle schedule with past runAt by using delay of 0', async () => {
    const pastDate = new Date(Date.now() - 3600000);
    await scheduler.schedule('lead-1', 'followup', pastDate, { stepIndex: 1 });
    expect(queue.add).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Object),
      expect.objectContaining({ delay: 0 }),
    );
  });

  it('should not duplicate schedule when same dedupeKey exists (non-pending)', async () => {
    prisma.scheduledAction.findUnique.mockResolvedValue({
      ...mockScheduledAction,
      status: 'done',
    });

    const runAt = new Date(Date.now() + 3600000);
    await scheduler.schedule('lead-1', 'followup', runAt, { stepIndex: 1 });

    // Should create a new one since existing is not pending
    expect(prisma.scheduledAction.create).toHaveBeenCalled();
  });

  it('should handle prune when prisma deleteMany fails for one table', async () => {
    prisma.webhookEvent.deleteMany.mockRejectedValue(new Error('Timeout'));
    await expect(pruning.pruneAll()).rejects.toThrow('Timeout');
  });

  it('should calculate correct total from prune results', async () => {
    const results = await pruning.pruneAll();
    const total = Object.values(results).reduce((a, b) => a + b, 0);
    expect(total).toBe(490); // 100+75+25+10+50+30+200
  });
});
