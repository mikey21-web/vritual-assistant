import { Test, TestingModule } from '@nestjs/testing';
import { DocumentSearchService } from './document-search.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

describe('DocumentSearchService', () => {
  let service: DocumentSearchService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      documentSearchIndex: {
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'doc-1', ...data })),
        findFirst: jest.fn().mockResolvedValue({ id: 'doc-1', tenantId: 't1' }),
        findMany: jest.fn().mockResolvedValue([{ id: 'doc-1', sourceType: 'MEDIA_FILE', sourceId: 'mf-1', searchableText: 'test.pdf' }]),
        delete: jest.fn().mockResolvedValue({ id: 'doc-1' }),
        deleteMany: jest.fn().mockResolvedValue({ count: 5 }),
        count: jest.fn().mockResolvedValue(10),
        groupBy: jest.fn().mockResolvedValue([{ sourceType: 'MEDIA_FILE', _count: 10 }]),
      },
      mediaFile: {
        findMany: jest.fn().mockResolvedValue([{ id: 'mf-1', fileName: 'test.pdf', mimeType: 'application/pdf' }]),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentSearchService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditLogsService, useValue: { log: jest.fn() } },
      ],
    }).compile();

    service = module.get(DocumentSearchService);
  });

  it('indexes a document', async () => {
    const doc = await service.indexDocument('t1', { sourceType: 'MEDIA_FILE', sourceId: 'mf-1', searchableText: 'test.pdf' });
    expect(doc.searchableText).toBe('test.pdf');
  });

  it('searches documents', async () => {
    const docs = await service.search('t1', 'test');
    expect(docs.length).toBe(1);
  });

  it('returns storage stats', async () => {
    const stats = await service.getStorageStats('t1');
    expect(stats.totalDocuments).toBe(10);
  });

  it('rebuilds index from media files', async () => {
    const result = await service.rebuildIndex('t1');
    expect(result.indexed).toBe(1);
  });
});
