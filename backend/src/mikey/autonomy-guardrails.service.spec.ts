import { Test, TestingModule } from '@nestjs/testing';
import { AutonomyGuardrailsService } from './autonomy-guardrails.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AutonomyGuardrailsService', () => {
  let service: AutonomyGuardrailsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      tenant: {
        findUnique: jest.fn().mockResolvedValue({ settings: {} }),
        update: jest.fn().mockResolvedValue({}),
      },
      mikeyAutonomousAction: { count: jest.fn().mockResolvedValue(0), findFirst: jest.fn().mockResolvedValue(null) },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [AutonomyGuardrailsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(AutonomyGuardrailsService);
  });

  it('defaults every category to autonomous when nothing is configured', async () => {
    const levels = await service.getAllCategoryLevels('t1');
    expect(levels).toEqual({
      lead_assignment: 'autonomous', lead_messaging: 'autonomous',
      task_escalation: 'autonomous', jarvis_tools: 'autonomous',
    });
  });

  it('blocks an internal action once its category is turned off', async () => {
    prisma.tenant.findUnique.mockResolvedValue({ settings: { mikeyAutonomyCategories: { task_escalation: 'off' } } });
    const gate = await service.canActInternally('t1', 'task_escalation');
    expect(gate.allowed).toBe(false);
    expect(gate.reason).toContain('turned off');
  });

  it('does not block a different category when only one is turned off', async () => {
    prisma.tenant.findUnique.mockResolvedValue({ settings: { mikeyAutonomyCategories: { task_escalation: 'off' } } });
    const gate = await service.canActInternally('t1', 'lead_assignment');
    expect(gate.allowed).toBe(true);
  });

  it('blocks in observe mode without touching the daily-cap check', async () => {
    prisma.tenant.findUnique.mockResolvedValue({ settings: { mikeyAutonomyCategories: { lead_messaging: 'observe' } } });
    const gate = await service.canMessageLeadAutonomously('t1', 'lead_messaging', 'lead-1');
    expect(gate.allowed).toBe(false);
    expect(prisma.mikeyAutonomousAction.count).not.toHaveBeenCalled();
  });

  it('setCategoryLevel persists alongside existing settings without clobbering them', async () => {
    prisma.tenant.findUnique.mockResolvedValue({ settings: { autonomyDailyCap: 25, mikeyAutonomyCategories: { lead_assignment: 'off' } } });
    await service.setCategoryLevel('t1', 'lead_messaging', 'off');
    expect(prisma.tenant.update).toHaveBeenCalledWith({
      where: { id: 't1' },
      data: { settings: { autonomyDailyCap: 25, mikeyAutonomyCategories: { lead_assignment: 'off', lead_messaging: 'off' } } },
    });
  });
});
