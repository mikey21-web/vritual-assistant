import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MemoryService } from './memory.service';
import { PrismaService } from '../prisma/prisma.service';

describe('MemoryService', () => {
  let service: MemoryService;
  let mockDb: any;

  const mockPrisma = () => ({
    mikeyMemory: {
      create: jest.fn().mockResolvedValue({ id: 'mem-1', key: 'episode:test-lead:test-event' }),
      findMany: jest.fn().mockResolvedValue([{ id: 'mem-1', key: 'episode:test-lead:test-event', value: 'test', confidence: 0.5 }]),
      findFirst: jest.fn().mockResolvedValue({ id: 'wm-1', value: '{"step":"qualifying"}', key: 'working:lead-1' }),
      update: jest.fn().mockResolvedValue({ id: 'mem-1', invalidAt: new Date() }),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      count: jest.fn().mockResolvedValue(3),
    },
    mikeyProceduralRule: {
      create: jest.fn().mockImplementation((d) => Promise.resolve({ id: 'rule-1', ...d.data, status: 'pending' })),
      update: jest.fn().mockImplementation((d) => Promise.resolve({ id: d.where.id, status: 'active' })),
      findMany: jest.fn().mockResolvedValue([{ id: 'rule-1', rule: 'test rule', status: 'active' }]),
      count: jest.fn().mockResolvedValue(1),
    },
    mikeyReflexionLog: {
      create: jest.fn().mockResolvedValue({ id: 'ref-1', outcomeType: 'lead_lost', candidateRule: 'JustDial' }),
      count: jest.fn().mockResolvedValue(1),
    },
    $disconnect: jest.fn(),
  });

  beforeAll(async () => {
    mockDb = mockPrisma();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MemoryService,
        { provide: PrismaService, useValue: mockDb },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue(undefined) } },
      ],
    }).compile();
    service = module.get<MemoryService>(MemoryService);
  });

  it('stores episodic memory', async () => {
    const entry = await service.store('test-tenant', {
      type: 'EPISODIC' as any,
      key: 'episode:test-lead:test-event',
      value: 'Booked a site visit',
      source: 'lead_voice',
      leadId: 'test-lead',
    });
    expect(entry).toBeDefined();
    expect(mockDb.mikeyMemory.create).toHaveBeenCalled();
  });

  it('proposes rule as pending, approve sets active', async () => {
    const rule = await service.proposeRule('test-tenant', 'send pricing fast', 'converts better', 'messaging');
    expect(rule.status).toBe('pending');

    const approved = await service.approveRule(rule.id, 'user-1');
    expect(approved.status).toBe('active');
    expect(mockDb.mikeyProceduralRule.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'active' }) }),
    );
  });

  it('injects active rules into prompt context', async () => {
    const rules = await service.getActiveRules('test-tenant');
    expect(rules.length).toBeGreaterThanOrEqual(0);
    expect(mockDb.mikeyProceduralRule.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tenantId: 'test-tenant', status: 'active' } }),
    );
  });

  it('logs reflexion entries', async () => {
    const log = await service.logReflexion('test-tenant', {
      outcomeType: 'lead_lost',
      entityId: 'lead-1',
      trajectory: [{ time: '2026-01-01T00:00:00Z', type: 'test' }],
      reflection: 'Lead was not responsive.',
      candidateRule: 'Send pricing in first message',
    });
    expect(log).toBeDefined();
    expect(log.candidateRule).toContain('JustDial');
    expect(mockDb.mikeyReflexionLog.create).toHaveBeenCalled();
  });

  it('manages working memory lifecycle', async () => {
    await service.setWorkingMemory('test-tenant', { step: 'qualifying' }, 'lead-1');
    expect(mockDb.mikeyMemory.updateMany).toHaveBeenCalled();
    expect(mockDb.mikeyMemory.create).toHaveBeenCalled();

    const wm = await service.getWorkingMemory('test-tenant', 'lead-1');
    expect(wm).toBeDefined();
  });

  it('returns stats', async () => {
    jest.spyOn(mockDb.mikeyMemory, 'count').mockResolvedValue(5);
    jest.spyOn(mockDb.mikeyProceduralRule, 'count').mockResolvedValue(2);
    jest.spyOn(mockDb.mikeyReflexionLog, 'count').mockResolvedValue(3);

    const stats = await service.getStats('test-tenant');
    expect(stats.memoryCount).toBe(5);
    expect(stats.activeRules).toBe(2);
    expect(stats.pendingRules).toBe(2);
    expect(stats.reflexionCount).toBe(3);
  });
});
