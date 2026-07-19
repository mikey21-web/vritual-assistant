import { Test, TestingModule } from '@nestjs/testing';
import { PortfolioService } from './portfolio.service';
import { PrismaService } from '../prisma/prisma.service';

describe('PortfolioService', () => {
  let service: PortfolioService;

  beforeEach(async () => {
    const prisma = {
      project: { count: jest.fn().mockResolvedValue(5), findMany: jest.fn().mockResolvedValue([]), findFirst: jest.fn().mockResolvedValue(null) },
      unit: { count: jest.fn().mockResolvedValue(100), aggregate: jest.fn().mockResolvedValue({ _sum: { areaSqft: 5000 } }), groupBy: jest.fn().mockResolvedValue([]) },
      lead: { count: jest.fn().mockResolvedValue(200) },
      booking: { count: jest.fn().mockResolvedValue(30) },
      paymentReceipt: { aggregate: jest.fn().mockResolvedValue({ _sum: { amountPaise: BigInt(50000000) } }), findMany: jest.fn().mockResolvedValue([]) },
      paymentSchedule: { aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 100000 } }), count: jest.fn().mockResolvedValue(15) },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [PortfolioService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(PortfolioService);
  });

  it('returns overview', async () => {
    const overview = await service.getOverview('t1');
    expect(overview.totalProjects).toBe(5);
    expect(overview.pipeline.leads).toBe(200);
  });

  it('returns cash position', async () => {
    const cp = await service.getCashPosition('t1');
    expect(cp.totalCollectedPaise).toBe(BigInt(50000000));
    expect(cp.outstandingSchedules).toBe(15);
  });
});
