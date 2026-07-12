import { Test, TestingModule } from '@nestjs/testing';
import { KnowledgeBaseService } from './knowledge-base.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

describe('KnowledgeBaseService', () => {
  let service: KnowledgeBaseService;
  let prisma: any;
  const auditLogs = { log: jest.fn().mockResolvedValue({}) };

  const mockEntry = {
    id: 'kb-1',
    question: 'What are your business hours?',
    answer: 'We are open Monday to Friday, 9am to 6pm.',
    category: 'general',
    keywords: ['hours', 'open', 'schedule'],
    active: true,
  };

  beforeEach(async () => {
    prisma = {
      knowledgeBaseEntry: {
        findMany: jest.fn().mockResolvedValue([mockEntry]),
        findUnique: jest.fn().mockResolvedValue(mockEntry),
        create: jest.fn().mockResolvedValue(mockEntry),
        update: jest.fn().mockResolvedValue({ ...mockEntry, active: false }),
        delete: jest.fn().mockResolvedValue(mockEntry),
      },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KnowledgeBaseService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditLogsService, useValue: auditLogs },
      ],
    }).compile();
    service = module.get<KnowledgeBaseService>(KnowledgeBaseService);
  });

  it('searches by keyword and returns matches', async () => {
    const result = await service.search('what are your hours');
    expect(prisma.knowledgeBaseEntry.findMany).toHaveBeenCalled();
    expect(result).toEqual([mockEntry]);
  });

  it('returns empty array for a blank query without hitting the database', async () => {
    const result = await service.search('   ');
    expect(result).toEqual([]);
    expect(prisma.knowledgeBaseEntry.findMany).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when updating a missing entry', async () => {
    prisma.knowledgeBaseEntry.findUnique.mockResolvedValueOnce(null);
    await expect(service.update('missing', { answer: 'x' })).rejects.toThrow('Knowledge base entry not found');
  });

  it('logs an audit entry on create', async () => {
    await service.create({ question: 'Q', answer: 'A' }, 'user-1');
    expect(auditLogs.log).toHaveBeenCalledWith('knowledge_base_entry_created', 'KnowledgeBaseEntry', mockEntry.id, 'user-1');
  });
});
