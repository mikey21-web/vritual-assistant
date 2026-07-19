import { Test, TestingModule } from '@nestjs/testing';
import { PhysicalDocumentsService } from './physical-documents.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

describe('PhysicalDocumentsService', () => {
  let service: PhysicalDocumentsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      physicalDocumentCustody: {
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'pd-1', ...data })),
        findFirst: jest.fn().mockResolvedValue({ id: 'pd-1', tenantId: 't1', checkedOutById: null, location: 'Cabinet A' }),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'pd-1', ...data })),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PhysicalDocumentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditLogsService, useValue: { log: jest.fn() } },
      ],
    }).compile();

    service = module.get(PhysicalDocumentsService);
  });

  it('creates a document record', async () => {
    const doc = await service.createRecord('t1', { fileNumber: 'FN-001', documentDescription: 'Sale Deed', location: 'Cabinet A' });
    expect(doc.fileNumber).toBe('FN-001');
  });

  it('checks out a document', async () => {
    const doc = await service.checkOut('t1', 'pd-1', 'u1');
    expect(doc.checkedOutById).toBe('u1');
  });

  it('checks in a document', async () => {
    prisma.physicalDocumentCustody.findFirst.mockResolvedValue({ id: 'pd-1', tenantId: 't1', checkedOutById: 'u1', location: 'Cabinet A' });
    const doc = await service.checkIn('t1', 'pd-1');
    expect(doc.returnedAt).toBeDefined();
  });

  it('returns location map', async () => {
    prisma.physicalDocumentCustody.findMany.mockResolvedValue([
      { id: 'pd-1', fileNumber: 'FN-001', documentDescription: 'Sale Deed', location: 'Cabinet A', checkedOutById: null, returnedAt: null },
    ]);
    const map = await service.getLocationMap('t1');
    expect(map.totalDocuments).toBe(1);
  });
});
