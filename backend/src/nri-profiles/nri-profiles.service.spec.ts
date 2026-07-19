import { Test, TestingModule } from '@nestjs/testing';
import { NriProfilesService } from './nri-profiles.service';
import { PrismaService } from '../prisma/prisma.service';
import { TimelineService } from '../timeline/timeline.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

describe('NriProfilesService', () => {
  let service: NriProfilesService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      lead: { findFirst: jest.fn().mockResolvedValue({ id: 'l1', tenantId: 't1' }) },
      nriBuyerProfile: {
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'nri-1', ...data })),
        findUnique: jest.fn().mockResolvedValue(null),
        findFirst: jest.fn().mockResolvedValue({ id: 'nri-1', lead: { tenantId: 't1' } }),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'nri-1', ...data })),
        count: jest.fn().mockResolvedValue(5),
        groupBy: jest.fn().mockResolvedValue([]),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NriProfilesService,
        { provide: PrismaService, useValue: prisma },
        { provide: TimelineService, useValue: { add: jest.fn() } },
        { provide: AuditLogsService, useValue: { log: jest.fn() } },
      ],
    }).compile();

    service = module.get(NriProfilesService);
  });

  it('creates an NRI profile', async () => {
    const p = await service.createProfile('t1', { leadId: 'l1', countryOfResidence: 'USA', timezone: 'America/New_York' });
    expect(p.countryOfResidence).toBe('USA');
  });

  it('prevents duplicate NRI profile', async () => {
    prisma.nriBuyerProfile.findUnique.mockResolvedValue({ id: 'existing' });
    await expect(service.createProfile('t1', { leadId: 'l1', countryOfResidence: 'UK', timezone: 'Europe/London' })).rejects.toThrow('already exists');
  });

  it('returns stats', async () => {
    const stats = await service.getStats('t1');
    expect(stats.total).toBe(5);
  });
});
