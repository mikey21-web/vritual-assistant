import { Test, TestingModule } from '@nestjs/testing';
import { OnboardingService } from './onboarding.service';
import { PrismaService } from '../prisma/prisma.service';

describe('OnboardingService', () => {
  let service: OnboardingService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      tenant: { findUnique: jest.fn().mockResolvedValue({ id: 't1', name: 'Acme Builders' }) },
      project: { count: jest.fn().mockResolvedValue(0) },
      user: { count: jest.fn().mockResolvedValue(1) },
      unit: { count: jest.fn().mockResolvedValue(0) },
      integration: { findFirst: jest.fn().mockResolvedValue(null), findMany: jest.fn().mockResolvedValue([]) },
      messageTemplate: { count: jest.fn().mockResolvedValue(0) },
      lead: { count: jest.fn().mockResolvedValue(0) },
      tenantOnboardingStep: { upsert: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [OnboardingService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(OnboardingService);
  });

  it('marks go-live as blocked when required steps are incomplete', async () => {
    const steps = await service.getProgress('t1');
    const goLive = steps.find((s) => s.key === 'goLive')!;
    expect(goLive.status).toBe('blocked');
  });

  it('marks go-live as complete when every required step has real data', async () => {
    prisma.project.count.mockResolvedValueOnce(1);
    prisma.unit.count.mockResolvedValueOnce(5);
    prisma.integration.findFirst.mockResolvedValue({ id: 'int-1', name: 'WhatsApp', type: 'whatsapp', status: 'connected' });
    prisma.integration.findMany.mockResolvedValueOnce([
      { id: 'int-1', name: 'WhatsApp', type: 'whatsapp', status: 'connected' },
      { id: 'int-2', name: 'MagicBricks', type: 'portal', status: 'connected' },
    ]);
    prisma.messageTemplate.count.mockResolvedValueOnce(2);
    prisma.lead.count.mockResolvedValueOnce(1);

    const steps = await service.getProgress('t1');
    const goLive = steps.find((s) => s.key === 'goLive')!;
    expect(goLive.status).toBe('complete');
  });

  it('does not count an unnamed company as complete', async () => {
    prisma.tenant.findUnique.mockResolvedValueOnce({ id: 't1', name: '' });
    const steps = await service.getProgress('t1');
    expect(steps.find((s) => s.key === 'company')!.status).toBe('not_started');
  });
});
