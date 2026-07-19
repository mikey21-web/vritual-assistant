import { Test, TestingModule } from '@nestjs/testing';
import { KycService } from './kyc.service';
import { PrismaService } from '../prisma/prisma.service';
import { TimelineService } from '../timeline/timeline.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { ForbiddenException } from '@nestjs/common';

describe('KycService', () => {
  let service: KycService;
  let prisma: any;

  const tenantId = 'tenant-1';
  const doc = { id: 'doc-1', tenantId, leadId: 'lead-1', type: 'PAN', status: 'UPLOADED' };

  beforeEach(async () => {
    prisma = {
      lead: { findFirst: jest.fn().mockResolvedValue({ id: 'lead-1', tenantId }) },
      buyerDocument: {
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'doc-1', ...data })),
        findFirst: jest.fn().mockResolvedValue(doc),
        update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ ...doc, ...data })),
        findMany: jest.fn().mockResolvedValue([doc, { ...doc, id: 'doc-2', status: 'VERIFIED' }]),
      },
      kycVerification: { create: jest.fn().mockResolvedValue({}) },
      $transaction: jest.fn().mockImplementation((ops: any[]) => Promise.all(ops)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KycService,
        { provide: PrismaService, useValue: prisma },
        { provide: TimelineService, useValue: { add: jest.fn() } },
        { provide: AuditLogsService, useValue: { log: jest.fn() } },
      ],
    }).compile();

    service = module.get(KycService);
  });

  it('never marks an uploaded document verified without an explicit verify call', async () => {
    const uploaded = await service.upload(tenantId, 'doc-1', { mediaFileId: 'media-1' });
    expect(uploaded.status).toBe('UPLOADED');
  });

  it('refuses to verify a document that has not been uploaded', async () => {
    prisma.buyerDocument.findFirst.mockResolvedValue({ ...doc, status: 'REQUESTED' });
    await expect(service.verify(tenantId, 'doc-1', 'manager-1')).rejects.toThrow(ForbiddenException);
  });

  it('creates a KycVerification record when a document is verified', async () => {
    await service.verify(tenantId, 'doc-1', 'manager-1');
    expect(prisma.kycVerification.create).toHaveBeenCalled();
  });

  it('clears a prior rejection reason on re-upload', async () => {
    prisma.buyerDocument.findFirst.mockResolvedValue({ ...doc, status: 'REJECTED', rejectionReason: 'blurry photo' });
    const updated = await service.upload(tenantId, 'doc-1', { mediaFileId: 'media-2' });
    expect(updated.rejectionReason).toBeNull();
  });

  it('excludes VERIFIED and WAIVED documents from the missing-documents queue', async () => {
    const missing = await service.findMissing(tenantId, 'lead-1');
    expect(missing).toHaveLength(1);
    expect(missing[0].id).toBe('doc-1');
  });
});
