import { Test, TestingModule } from '@nestjs/testing';
import { ReferralsService } from './referrals.service';
import { PrismaService } from '../prisma/prisma.service';
import { TimelineService } from '../timeline/timeline.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

describe('ReferralsService', () => {
  let service: ReferralsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      referralProgram: {
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'rp-1', ...data })),
        findFirst: jest.fn().mockResolvedValue({ id: 'rp-1', tenantId: 't1', active: true }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      referral: {
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'ref-1', ...data })),
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'ref-1', ...data })),
        count: jest.fn().mockResolvedValue(10),
        groupBy: jest.fn().mockResolvedValue([]),
      },
      contact: { findFirst: jest.fn().mockResolvedValue({ id: 'c1', tenantId: 't1', name: 'Raj', phone: '8888888888' }), findMany: jest.fn().mockResolvedValue([]) },
      lead: { findFirst: jest.fn().mockResolvedValue({ id: 'l1', tenantId: 't1' }) },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReferralsService,
        { provide: PrismaService, useValue: prisma },
        { provide: TimelineService, useValue: { add: jest.fn() } },
        { provide: AuditLogsService, useValue: { log: jest.fn() } },
      ],
    }).compile();

    service = module.get(ReferralsService);
  });

  it('creates a program', async () => {
    const p = await service.createProgram('t1', { name: 'Refer & Earn', rewardType: 'FLAT', rewardAmountPaise: '500000' });
    expect(p.name).toBe('Refer & Earn');
  });

  it('creates a referral', async () => {
    const ref = await service.createReferral('t1', { programId: 'rp-1', referrerContactId: 'c1', referredPhone: '9999999999', referredLeadId: 'l1' });
    expect(ref.referredPhone).toBe('9999999999');
  });

  it('prevents duplicate referral', async () => {
    prisma.referral.findFirst.mockResolvedValue({ id: 'existing', status: 'SUBMITTED' });
    await expect(service.createReferral('t1', { programId: 'rp-1', referrerContactId: 'c1', referredPhone: '9999999999' })).rejects.toThrow('already exists');
  });
});
