import { Test, TestingModule } from '@nestjs/testing';
import { ProactiveSweepProcessor } from './proactive-sweep.processor';
import { PrismaService } from '../prisma/prisma.service';
import { AutomationSchedulerService } from './automation-scheduler.service';
import { TasksService } from '../tasks/tasks.service';

describe('ProactiveSweepProcessor', () => {
  let processor: ProactiveSweepProcessor;
  let prisma: any;
  const scheduler = { schedule: jest.fn().mockResolvedValue(undefined) };
  const tasks = { create: jest.fn().mockResolvedValue({ id: 'task-1' }) };

  const quietLead = {
    id: 'lead-1',
    conversations: [{ direction: 'OUTBOUND', createdAt: new Date(Date.now() - 25 * 3600 * 1000) }],
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma = {
      lead: { findMany: jest.fn().mockResolvedValue([]) },
      scheduledAction: { findFirst: jest.fn().mockResolvedValue(null) },
      task: { findFirst: jest.fn().mockResolvedValue(null) },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProactiveSweepProcessor,
        { provide: PrismaService, useValue: prisma },
        { provide: AutomationSchedulerService, useValue: scheduler },
        { provide: TasksService, useValue: tasks },
      ],
    }).compile();

    processor = module.get<ProactiveSweepProcessor>(ProactiveSweepProcessor);
  });

  it('schedules a re_engage run for a lead that went quiet after we messaged them', async () => {
    prisma.lead.findMany.mockResolvedValueOnce([quietLead]).mockResolvedValueOnce([]);
    const result = await processor.process({} as any);
    expect(scheduler.schedule).toHaveBeenCalledWith('lead-1', 're_engage', expect.any(Date));
    expect(result.reEngaged).toBe(1);
  });

  it('does not re_engage a lead more than once', async () => {
    prisma.lead.findMany.mockResolvedValueOnce([quietLead]).mockResolvedValueOnce([]);
    prisma.scheduledAction.findFirst.mockResolvedValue({ id: 'sa-1' });
    const result = await processor.process({} as any);
    expect(scheduler.schedule).not.toHaveBeenCalled();
    expect(result.reEngaged).toBe(0);
  });

  it('skips leads whose last message was INBOUND (they replied, not quiet)', async () => {
    const repliedLead = { id: 'lead-2', conversations: [{ direction: 'INBOUND', createdAt: new Date(Date.now() - 25 * 3600 * 1000) }] };
    prisma.lead.findMany.mockResolvedValueOnce([repliedLead]).mockResolvedValueOnce([]);
    const result = await processor.process({} as any);
    expect(scheduler.schedule).not.toHaveBeenCalled();
    expect(result.reEngaged).toBe(0);
  });

  it('skips leads with no conversation history yet', async () => {
    const freshLead = { id: 'lead-3', conversations: [] };
    prisma.lead.findMany.mockResolvedValueOnce([freshLead]).mockResolvedValueOnce([]);
    const result = await processor.process({} as any);
    expect(scheduler.schedule).not.toHaveBeenCalled();
  });

  it('creates a task for a hot unassigned lead instead of messaging it', async () => {
    const hotLead = { id: 'lead-4', segment: 'HOT', assignedAgentId: null };
    prisma.lead.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([hotLead]);
    const result = await processor.process({} as any);
    expect(tasks.create).toHaveBeenCalledWith(expect.objectContaining({ leadId: 'lead-4', priority: 'high' }));
    expect(scheduler.schedule).not.toHaveBeenCalled();
    expect(result.alerted).toBe(1);
  });

  it('does not duplicate the hot-lead alert task', async () => {
    const hotLead = { id: 'lead-4', segment: 'HOT', assignedAgentId: null };
    prisma.lead.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([hotLead]);
    prisma.task.findFirst.mockResolvedValue({ id: 'existing-task' });
    const result = await processor.process({} as any);
    expect(tasks.create).not.toHaveBeenCalled();
    expect(result.alerted).toBe(0);
  });
});
