import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { AdvancedMarketingService } from './advanced-marketing.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

describe('AdvancedMarketingService', () => {
  let service: AdvancedMarketingService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      landingPage: {
        findFirst: jest.fn().mockResolvedValue({ id: 'lp-1', tenantId: 't1', status: 'DRAFT' }),
        update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'lp-1', ...data })),
        create: jest.fn(),
        findMany: jest.fn(),
      },
      audienceSegment: {
        findFirst: jest.fn().mockResolvedValue({ id: 'seg-1', tenantId: 't1', filters: { status: 'NEW' } }),
      },
      lead: { count: jest.fn().mockResolvedValue(3), findMany: jest.fn().mockResolvedValue([]) },
      suppressionEntry: {
        upsert: jest.fn().mockImplementation(({ create }) => Promise.resolve({ id: 'sup-1', ...create })),
        findUnique: jest.fn(),
      },
      adSpendImport: { groupBy: jest.fn().mockResolvedValue([]) },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdvancedMarketingService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditLogsService, useValue: { log: jest.fn() } },
      ],
    }).compile();

    service = module.get(AdvancedMarketingService);
  });

  it('rejects publishing a non-DRAFT landing page', async () => {
    prisma.landingPage.findFirst.mockResolvedValueOnce({ id: 'lp-1', tenantId: 't1', status: 'PUBLISHED' });
    await expect(service.publishLandingPage('t1', 'lp-1')).rejects.toThrow(ForbiddenException);
  });

  it('publishes a DRAFT landing page', async () => {
    const page = await service.publishLandingPage('t1', 'lp-1');
    expect(page.status).toBe('PUBLISHED');
  });

  it('returns a count and sample when previewing a segment', async () => {
    const preview = await service.previewSegment('t1', 'seg-1');
    expect(preview.count).toBe(3);
  });

  it('upserts a suppression entry keyed by tenant/channel/contact', async () => {
    const entry = await service.addSuppression('t1', { channel: 'WHATSAPP', contactRef: '+911234567890' });
    expect(entry.channel).toBe('WHATSAPP');
  });
});
