import { Test, TestingModule } from '@nestjs/testing';
import { ESignService } from './esign.service';
import { PrismaService } from '../prisma/prisma.service';
import { TimelineService } from '../timeline/timeline.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { DocuSignAdapter } from './esign-providers/docusign.adapter';
import { ZohoSignAdapter } from './esign-providers/zoho-sign.adapter';
import { ForbiddenException, BadRequestException } from '@nestjs/common';

describe('ESignService', () => {
  let service: ESignService;
  let prisma: any;
  let module: TestingModule;

  const tenantId = 't1';
  const request = { id: 'esign-1', tenantId, provider: 'MANUAL', status: 'CREATED' };

  beforeEach(async () => {
    prisma = {
      generatedDocument: { findFirst: jest.fn().mockResolvedValue({ id: 'doc-1', tenantId }) },
      eSignRequest: {
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'esign-1', ...data })),
        findFirst: jest.fn().mockResolvedValue(request),
        findMany: jest.fn().mockResolvedValue([request]),
        update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ ...request, ...data })),
      },
    };

    module = await Test.createTestingModule({
      providers: [
        ESignService,
        { provide: PrismaService, useValue: prisma },
        { provide: TimelineService, useValue: { add: jest.fn() } },
        { provide: AuditLogsService, useValue: { log: jest.fn() } },
        { provide: DocuSignAdapter, useValue: { send: jest.fn() } },
        { provide: ZohoSignAdapter, useValue: { send: jest.fn() } },
      ],
    }).compile();

    service = module.get(ESignService);
  });

  it('creates a request defaulting to MANUAL provider', async () => {
    const r = await service.createRequest(tenantId, { generatedDocumentId: 'doc-1' });
    expect(r.provider).toBe('MANUAL');
  });

  it('allows staff to attest a MANUAL request as signed', async () => {
    const r = await service.recordManualSigned(tenantId, 'esign-1', 'staff-1', 'Physical copy received');
    expect(r.status).toBe('SIGNED');
  });

  it('refuses to let staff attest a non-MANUAL (real provider) request as signed', async () => {
    prisma.eSignRequest.findFirst.mockResolvedValue({ ...request, provider: 'DOCUSIGN' });
    await expect(
      service.recordManualSigned(tenantId, 'esign-1', 'staff-1', 'trying to bypass'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('refuses to transition a request that is already SIGNED', async () => {
    prisma.eSignRequest.findFirst.mockResolvedValue({ ...request, status: 'SIGNED' });
    await expect(service.markSent(tenantId, 'esign-1')).rejects.toThrow(ForbiddenException);
  });

  it('dispatches to the DocuSign adapter and stores the envelopeId when sending a non-MANUAL request', async () => {
    const docuSign = module.get(DocuSignAdapter) as any;
    docuSign.send.mockResolvedValue('envelope-123');
    prisma.eSignRequest.findFirst.mockResolvedValue({ ...request, provider: 'DOCUSIGN', signerName: 'A', signerEmail: 'a@x.com' });
    prisma.generatedDocument.findFirst.mockResolvedValue({ id: 'doc-1', tenantId, mediaFile: { publicUrl: 'https://x/doc.pdf' } });

    const updated = await service.markSent(tenantId, 'esign-1');

    expect(docuSign.send).toHaveBeenCalledWith(expect.objectContaining({ documentUrl: 'https://x/doc.pdf', signerEmail: 'a@x.com' }));
    expect(updated.envelopeId).toBe('envelope-123');
  });

  it('refuses to send via a real provider when the document has no file yet', async () => {
    prisma.eSignRequest.findFirst.mockResolvedValue({ ...request, provider: 'DOCUSIGN', signerName: 'A', signerEmail: 'a@x.com' });
    prisma.generatedDocument.findFirst.mockResolvedValue({ id: 'doc-1', tenantId, mediaFile: null });
    await expect(service.markSent(tenantId, 'esign-1')).rejects.toThrow(BadRequestException);
  });

  it('markProviderDecision marks SIGNED only for a SENT request matching provider+envelopeId', async () => {
    prisma.eSignRequest.findFirst.mockResolvedValue({ id: 'esign-1', provider: 'DOCUSIGN', envelopeId: 'env-1', status: 'SENT' });
    const updated = await service.markProviderDecision('DOCUSIGN', 'env-1', 'SIGNED');
    expect(updated?.status).toBe('SIGNED');
  });

  it('markProviderDecision ignores an unknown envelope rather than throwing', async () => {
    prisma.eSignRequest.findFirst.mockResolvedValue(null);
    const result = await service.markProviderDecision('DOCUSIGN', 'unknown-env', 'SIGNED');
    expect(result).toBeNull();
  });
});
