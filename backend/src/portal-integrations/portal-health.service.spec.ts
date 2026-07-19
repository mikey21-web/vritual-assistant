import { Test, TestingModule } from '@nestjs/testing';
import { PortalHealthService } from './portal-health.service';
import { PrismaService } from '../prisma/prisma.service';

describe('PortalHealthService', () => {
  let service: PortalHealthService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      webhookEvent: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [PortalHealthService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(PortalHealthService);
  });

  it('marks a provider NEVER_CONNECTED when no event has ever been recorded', async () => {
    const health = await service.getHealth();
    expect(health.find(h => h.provider === 'indiamart')?.status).toBe('NEVER_CONNECTED');
  });

  it('marks a provider ACTIVE when its last event is recent', async () => {
    prisma.webhookEvent.findFirst.mockResolvedValue({ createdAt: new Date() });
    const health = await service.getHealth();
    expect(health[0].status).toBe('ACTIVE');
  });

  it('marks a provider STALE when its last event is older than 7 days', async () => {
    prisma.webhookEvent.findFirst.mockResolvedValue({ createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) });
    const health = await service.getHealth();
    expect(health[0].status).toBe('STALE');
  });

  it('splits the 7-day count into created vs duplicate', async () => {
    prisma.webhookEvent.findFirst.mockResolvedValue({ createdAt: new Date() });
    prisma.webhookEvent.findMany.mockResolvedValue([
      { processedResult: { status: 'created' } },
      { processedResult: { status: 'created' } },
      { processedResult: { status: 'duplicate' } },
    ]);
    const health = await service.getHealth();
    expect(health[0].createdCount7d).toBe(2);
    expect(health[0].duplicateCount7d).toBe(1);
  });
});
