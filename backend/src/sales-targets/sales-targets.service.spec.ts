import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { SalesTargetsService } from './sales-targets.service';
import { PrismaService } from '../prisma/prisma.service';

describe('SalesTargetsService', () => {
  let service: SalesTargetsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      salesTarget: {
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'st-1', ...data })),
        findFirst: jest.fn().mockResolvedValue({
          id: 'st-1', tenantId: 't1', metric: 'BOOKINGS', projectId: null, userId: null,
          periodStart: new Date('2026-07-01'), periodEnd: new Date('2026-07-31'), targetValue: 10,
        }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      booking: { count: jest.fn().mockResolvedValue(4), aggregate: jest.fn() },
      siteVisit: { count: jest.fn() },
      paymentReceipt: { aggregate: jest.fn() },
      lead: { count: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [SalesTargetsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(SalesTargetsService);
  });

  it('throws when target does not exist', async () => {
    prisma.salesTarget.findFirst.mockResolvedValueOnce(null);
    await expect(service.getProgress('t1', 'missing')).rejects.toThrow(NotFoundException);
  });

  it('computes percentComplete for a BOOKINGS target', async () => {
    const result = await service.getProgress('t1', 'st-1');
    expect(result.actualValue).toBe(4);
    expect(result.percentComplete).toBe(40);
  });

  it('creates a target with the given scope/metric', async () => {
    const t = await service.createTarget('t1', {
      scope: 'TENANT', metric: 'BOOKINGS', periodStart: '2026-07-01', periodEnd: '2026-07-31', targetValue: 10,
    });
    expect(t.scope).toBe('TENANT');
  });
});
