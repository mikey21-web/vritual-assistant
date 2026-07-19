import { Test, TestingModule } from '@nestjs/testing';
import { ConstructionErpService } from './construction-erp.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

describe('ConstructionErpService', () => {
  let service: ConstructionErpService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      project: { findFirst: jest.fn().mockResolvedValue({ id: 'p1', tenantId: 't1' }) },
      constructionErpConnection: {
        upsert: jest.fn().mockImplementation(({ create }) => Promise.resolve({ id: 'c-1', ...create })),
        findMany: jest.fn().mockResolvedValue([]),
      },
      constructionMilestoneUpdate: {
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'm-1', ...data })),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConstructionErpService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditLogsService, useValue: { log: jest.fn() } },
      ],
    }).compile();

    service = module.get(ConstructionErpService);
  });

  it('configures a connection', async () => {
    const c = await service.configureConnection('t1', { projectId: 'p1', provider: 'manual' });
    expect(c.provider).toBe('manual');
  });

  it('records a milestone', async () => {
    const m = await service.recordMilestone('t1', { projectId: 'p1', milestoneName: 'Foundation', percentComplete: 25 });
    expect(m.milestoneName).toBe('Foundation');
  });

  it('processes webhook', async () => {
    const result = await service.handleWebhook('t1', 'procore', { update: 'progress' });
    expect(result.received).toBe(true);
  });
});
