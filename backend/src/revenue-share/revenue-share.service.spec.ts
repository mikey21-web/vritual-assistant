import { Test, TestingModule } from '@nestjs/testing';
import { RevenueShareService } from './revenue-share.service';
import { PrismaService } from '../prisma/prisma.service';
import { TimelineService } from '../timeline/timeline.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

describe('RevenueShareService', () => {
  let service: RevenueShareService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      project: { findFirst: jest.fn().mockResolvedValue({ id: 'p1', tenantId: 't1' }) },
      revenueShareParty: {
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'rs-1', ...data })),
        findFirst: jest.fn().mockResolvedValue({ id: 'rs-1', tenantId: 't1' }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      revenueShareAllocation: {
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'all-1', ...data })),
        findFirst: jest.fn().mockResolvedValue({ id: 'all-1', party: { tenantId: 't1' } }),
        update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'all-1', ...data })),
      },
      booking: { findUnique: jest.fn().mockResolvedValue({ id: 'b1', leadId: 'l1' }) },
      timeline: { add: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RevenueShareService,
        { provide: PrismaService, useValue: prisma },
        { provide: TimelineService, useValue: { add: jest.fn() } },
        { provide: AuditLogsService, useValue: { log: jest.fn() } },
      ],
    }).compile();

    service = module.get(RevenueShareService);
  });

  it('creates a party', async () => {
    const p = await service.createParty('t1', { projectId: 'p1', partyName: 'Anand', partyType: 'LANDOWNER', sharePercent: 25 });
    expect(p.partyName).toBe('Anand');
    expect(p.sharePercent).toBe(25);
  });

  it('creates an allocation', async () => {
    const a = await service.createAllocation('t1', { partyId: 'rs-1', bookingId: 'b1', allocatedAmountPaise: '500000' });
    expect(a.allocatedAmountPaise).toBe(BigInt(500000));
  });
});
