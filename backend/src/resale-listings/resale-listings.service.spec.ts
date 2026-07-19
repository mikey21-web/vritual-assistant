import { Test, TestingModule } from '@nestjs/testing';
import { ResaleListingsService } from './resale-listings.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

describe('ResaleListingsService', () => {
  let service: ResaleListingsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      unit: { findFirst: jest.fn().mockResolvedValue({ id: 'u1', status: 'SOLD', project: { tenantId: 't1' } }) },
      resaleListing: {
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'rl-1', ...data })),
        findFirst: jest.fn().mockResolvedValue({ id: 'rl-1', tenantId: 't1', status: 'AVAILABLE' }),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'rl-1', ...data })),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResaleListingsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditLogsService, useValue: { log: jest.fn() } },
      ],
    }).compile();

    service = module.get(ResaleListingsService);
  });

  it('creates a listing', async () => {
    const l = await service.createListing('t1', { listingType: 'RESALE', askingPriceRupees: 5000000 });
    expect(l.listingType).toBe('RESALE');
  });

  it('updates listing status', async () => {
    const l = await service.updateStatus('t1', 'rl-1', 'CLOSED');
    expect(l.status).toBe('CLOSED');
  });
});
