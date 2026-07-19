import { Test, TestingModule } from '@nestjs/testing';
import { LaunchControlService } from './launch-control.service';
import { PrismaService } from '../prisma/prisma.service';

describe('LaunchControlService', () => {
  let service: LaunchControlService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      lead: { count: jest.fn().mockResolvedValue(12) },
      slaBreach: { count: jest.fn().mockResolvedValue(3) },
      agentAvailability: { count: jest.fn().mockResolvedValue(2) },
      siteVisit: { count: jest.fn().mockResolvedValue(5) },
      checkoutHold: { count: jest.fn().mockResolvedValue(1) },
      paymentIntent: { count: jest.fn().mockResolvedValue(0) },
      unitStatusHistory: { count: jest.fn().mockResolvedValue(0) },
      integrationEvent: { count: jest.fn().mockResolvedValue(0) },
      inventoryReleaseBatch: { findMany: jest.fn().mockResolvedValue([]) },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [LaunchControlService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(LaunchControlService);
  });

  it('aggregates live counts into one status object', async () => {
    const status = await service.getStatus('t1');
    expect(status.newLeadsLast15Min).toBe(12);
    expect(status.openSlaBreaches).toBe(3);
  });

  it('scopes site visits and release batches to a project when given', async () => {
    await service.getStatus('t1', 'proj-1');
    expect(prisma.siteVisit.count).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ projectId: 'proj-1' }) }),
    );
  });
});
