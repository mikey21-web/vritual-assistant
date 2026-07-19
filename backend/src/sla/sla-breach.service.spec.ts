import { Test, TestingModule } from '@nestjs/testing';
import { SlaBreachService } from './sla-breach.service';
import { PrismaService } from '../prisma/prisma.service';

describe('SlaBreachService', () => {
  let service: SlaBreachService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      slaBreach: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'breach-1', ...data })),
        findMany: jest.fn().mockResolvedValue([]),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        count: jest.fn().mockResolvedValue(0),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [SlaBreachService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(SlaBreachService);
  });

  it('does not create a duplicate breach when one is already open for the entity', async () => {
    prisma.slaBreach.findFirst.mockResolvedValue({ id: 'existing' });
    await service.recordBreach({ tenantId: 't1', entityType: 'lead', entityId: 'lead-1', breachType: 'stale_hot_lead' });
    expect(prisma.slaBreach.create).not.toHaveBeenCalled();
  });

  it('reconcile resolves breaches for entities no longer in the breaching set', async () => {
    prisma.slaBreach.findMany.mockResolvedValue([{ id: 'breach-1', entityId: 'lead-1' }, { id: 'breach-2', entityId: 'lead-2' }]);
    await service.reconcile('lead', 'stale_hot_lead', [{ tenantId: 't1', entityId: 'lead-1' }]);
    expect(prisma.slaBreach.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: { in: ['breach-2'] } }) }),
    );
  });

  it('reconcile creates a breach only for entities not already open', async () => {
    prisma.slaBreach.findMany.mockResolvedValue([{ id: 'breach-1', entityId: 'lead-1' }]);
    await service.reconcile('lead', 'stale_hot_lead', [
      { tenantId: 't1', entityId: 'lead-1' },
      { tenantId: 't1', entityId: 'lead-2' },
    ]);
    expect(prisma.slaBreach.create).toHaveBeenCalledTimes(1);
    expect(prisma.slaBreach.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ entityId: 'lead-2' }) }),
    );
  });

  it('reconcile with an empty breaching set resolves all open breaches of that type', async () => {
    prisma.slaBreach.findMany.mockResolvedValue([{ id: 'breach-1', entityId: 'lead-1' }]);
    await service.reconcile('lead', 'stale_hot_lead', []);
    expect(prisma.slaBreach.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: { in: ['breach-1'] } }) }),
    );
  });
});
