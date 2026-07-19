import { Test, TestingModule } from '@nestjs/testing';
import { CashFlowForecastService } from './cash-flow-forecast.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

describe('CashFlowForecastService', () => {
  let service: CashFlowForecastService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      project: { findFirst: jest.fn().mockResolvedValue({ id: 'p1', tenantId: 't1' }) },
      cashFlowForecastEntry: {
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'cf-1', ...data })),
        findFirst: jest.fn().mockResolvedValue({ id: 'cf-1', tenantId: 't1' }),
        findMany: jest.fn().mockResolvedValue([{ id: 'cf-1', entryType: 'EXPECTED_COLLECTION', amountPaise: BigInt(100000), expectedDate: new Date() }]),
        delete: jest.fn().mockResolvedValue({ id: 'cf-1' }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CashFlowForecastService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditLogsService, useValue: { log: jest.fn() } },
      ],
    }).compile();

    service = module.get(CashFlowForecastService);
  });

  it('creates a forecast entry', async () => {
    const f = await service.createEntry('t1', {
      projectId: 'p1', entryType: 'EXPECTED_COLLECTION', amountPaise: '10000000',
      expectedDate: '2026-06-15', sourceType: 'manual',
    });
    expect(f.amountPaise).toBe(BigInt(10000000));
  });

  it('finds entries by project', async () => {
    const entries = await service.findByProject('t1', 'p1');
    expect(entries.length).toBe(1);
  });

  it('returns project summary', async () => {
    const summary = await service.getProjectSummary('p1', 't1');
    expect(summary.totalExpectedInflowsPaise).toBe(BigInt(100000));
  });
});
