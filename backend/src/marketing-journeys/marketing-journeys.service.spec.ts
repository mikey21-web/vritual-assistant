import { Test, TestingModule } from '@nestjs/testing';
import { MarketingJourneysService } from './marketing-journeys.service';
import { PrismaService } from '../prisma/prisma.service';
import { TimelineService } from '../timeline/timeline.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { ForbiddenException, BadRequestException } from '@nestjs/common';

describe('MarketingJourneysService', () => {
  let service: MarketingJourneysService;
  let prisma: any;

  const tenantId = 'tenant-1';
  const baseJourney = { id: 'j1', tenantId, name: 'Test Journey', status: 'DRAFT', entryEventType: 'lead.created', version: 1 };

  beforeEach(async () => {
    prisma = {
      marketingJourney: {
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ ...baseJourney, ...data })),
        findFirst: jest.fn().mockResolvedValue(baseJourney),
        findMany: jest.fn().mockResolvedValue([baseJourney]),
        update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ ...baseJourney, ...data })),
      },
      marketingJourneyStep: {
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'step-1', ...data })),
        findMany: jest.fn().mockResolvedValue([]),
      },
      marketingJourneyEnrollment: {
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'enr-1', ...data })),
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'enr-1', ...data })),
      },
      lead: {
        findFirst: jest.fn().mockResolvedValue({ id: 'lead-1', tenantId }),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketingJourneysService,
        { provide: PrismaService, useValue: prisma },
        { provide: TimelineService, useValue: { add: jest.fn() } },
        { provide: AuditLogsService, useValue: { log: jest.fn() } },
      ],
    }).compile();

    service = module.get(MarketingJourneysService);
  });

  it('creates a journey', async () => {
    const j = await service.createJourney(tenantId, { name: 'Nurture 1', entryEventType: 'lead.created' });
    expect(j.name).toBe('Nurture 1');
  });

  it('enrolls a lead and snapshots version', async () => {
    const enr = await service.enrollLead(tenantId, 'j1', 'lead-1');
    expect(enr.leadId).toBe('lead-1');
    expect(prisma.marketingJourneyEnrollment.create.mock.calls[0][0].data.journeySnapshot).toBeDefined();
  });

  it('prevents duplicate enrollment', async () => {
    prisma.marketingJourneyEnrollment.findFirst.mockResolvedValue({ id: 'existing', status: 'ACTIVE' });
    await expect(service.enrollLead(tenantId, 'j1', 'lead-1')).rejects.toThrow(BadRequestException);
  });

  it('blocks activate when not DRAFT', async () => {
    prisma.marketingJourney.findFirst.mockResolvedValue({ ...baseJourney, status: 'ACTIVE' });
    await expect(service.activateJourney(tenantId, 'j1')).rejects.toThrow(ForbiddenException);
  });
});
