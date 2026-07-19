import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TimelineService } from '../timeline/timeline.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { DocuSignAdapter } from './esign-providers/docusign.adapter';
import { ZohoSignAdapter } from './esign-providers/zoho-sign.adapter';
import { ESignStatus } from '@prisma/client';

/**
 * "MANUAL" tracking mode (spec 69.2) keeps physical/offline signing supported
 * as an audited staff attestation. DOCUSIGN and ZOHO_SIGN dispatch through
 * real provider APIs (see esign-providers/*.adapter.ts) once the tenant's
 * credentials are configured — sending never claims success without a real
 * API response, and a document is only marked SIGNED by a verified provider
 * webhook (see webhooks.controller.ts) or, for MANUAL, an explicit staff
 * attestation. Aadhaar eSign/NSDL is not implemented: it requires an
 * empanelled ASP's specific SDK, which must be chosen before it can be built.
 */
@Injectable()
export class ESignService {
  constructor(
    private prisma: PrismaService,
    private timeline: TimelineService,
    private auditLogs: AuditLogsService,
    private docuSign: DocuSignAdapter,
    private zohoSign: ZohoSignAdapter,
  ) {}

  async createRequest(tenantId: string, data: {
    generatedDocumentId: string;
    signerName?: string;
    signerEmail?: string;
    signerPhone?: string;
    provider?: string;
  }) {
    const doc = await this.prisma.generatedDocument.findFirst({ where: { id: data.generatedDocumentId, tenantId } });
    if (!doc) throw new NotFoundException('Generated document not found');
    if (data.provider && !['MANUAL', 'DOCUSIGN', 'ZOHO_SIGN'].includes(data.provider)) {
      throw new BadRequestException('Unsupported e-sign provider');
    }

    return this.prisma.eSignRequest.create({
      data: {
        tenantId,
        generatedDocumentId: data.generatedDocumentId,
        provider: data.provider || 'MANUAL',
        signerName: data.signerName,
        signerEmail: data.signerEmail,
        signerPhone: data.signerPhone,
      },
    });
  }

  async findAll(tenantId: string, query: { generatedDocumentId?: string; status?: string }) {
    const where: any = { tenantId };
    if (query.generatedDocumentId) where.generatedDocumentId = query.generatedDocumentId;
    if (query.status) where.status = query.status;
    return this.prisma.eSignRequest.findMany({ where, orderBy: { createdAt: 'desc' } });
  }

  /** Dispatches to the real provider (DocuSign/Zoho Sign) if configured for this request; MANUAL requests just flip status for staff tracking. */
  async markSent(tenantId: string, id: string, actorId?: string) {
    const req = await this.require(tenantId, id, [ESignStatus.CREATED]);
    let envelopeId: string | undefined;

    if (req.provider !== 'MANUAL') {
      const doc = await this.prisma.generatedDocument.findFirst({
        where: { id: req.generatedDocumentId, tenantId },
        include: { mediaFile: true },
      });
      const documentUrl = doc?.mediaFile?.publicUrl || doc?.mediaFile?.signedUrl;
      if (!documentUrl) throw new BadRequestException('Generated document has no file to send for signature');
      if (!req.signerName || !req.signerEmail) throw new BadRequestException('Signer name and email are required to send via a real e-sign provider');

      const adapter = req.provider === 'DOCUSIGN' ? this.docuSign : req.provider === 'ZOHO_SIGN' ? this.zohoSign : null;
      if (!adapter) throw new BadRequestException(`Unsupported e-sign provider: ${req.provider}`);
      envelopeId = await adapter.send({
        documentUrl,
        documentName: `document-${req.generatedDocumentId}.pdf`,
        signerName: req.signerName,
        signerEmail: req.signerEmail,
      });
    }

    const updated = await this.prisma.eSignRequest.update({
      where: { id: req.id },
      data: { status: ESignStatus.SENT, sentAt: new Date(), envelopeId },
    });
    await this.auditLogs.log('ESIGN_SENT', 'ESignRequest', id, actorId, { provider: req.provider, envelopeId });
    return updated;
  }

  /** Called only from a signature-verified provider webhook — never from a client request. */
  async markProviderDecision(provider: string, envelopeId: string, decision: 'SIGNED' | 'REJECTED', reason?: string) {
    const req = await this.prisma.eSignRequest.findFirst({ where: { provider, envelopeId } });
    if (!req) return null; // unknown envelope — ignore rather than throw, webhooks retry
    if (req.status !== ESignStatus.SENT) return req; // already terminal or not yet sent; ignore duplicate callback
    const updated = await this.prisma.eSignRequest.update({
      where: { id: req.id },
      data: {
        status: decision === 'SIGNED' ? ESignStatus.SIGNED : ESignStatus.REJECTED,
        completedAt: decision === 'SIGNED' ? new Date() : undefined,
        metadata: reason ? { reason } : undefined,
      },
    });
    await this.auditLogs.log(`ESIGN_PROVIDER_${decision}`, 'ESignRequest', req.id, undefined, { provider, envelopeId, reason });
    return updated;
  }

  /** Explicit staff attestation for a physically/manually signed document — never an automated claim. */
  async recordManualSigned(tenantId: string, id: string, actorId: string, evidenceNote: string) {
    const req = await this.require(tenantId, id, [ESignStatus.SENT, ESignStatus.CREATED]);
    if (req.provider !== 'MANUAL') {
      throw new ForbiddenException('Only MANUAL-provider requests can be marked signed by staff attestation — provider-signed requests must come via a verified webhook');
    }
    const updated = await this.prisma.eSignRequest.update({
      where: { id: req.id },
      data: { status: ESignStatus.SIGNED, completedAt: new Date(), metadata: { manualAttestedBy: actorId, evidenceNote } },
    });
    await this.timeline.add({
      type: 'document_manually_signed',
      title: 'Document marked signed (manual attestation)',
      metadata: { esignRequestId: id, evidenceNote },
      createdById: actorId,
    });
    await this.auditLogs.log('ESIGN_MANUAL_SIGNED', 'ESignRequest', id, actorId, { evidenceNote });
    return updated;
  }

  async markRejected(tenantId: string, id: string, reason: string, actorId?: string) {
    const req = await this.require(tenantId, id, [ESignStatus.SENT, ESignStatus.CREATED]);
    const updated = await this.prisma.eSignRequest.update({ where: { id: req.id }, data: { status: ESignStatus.REJECTED, metadata: { reason } } });
    await this.auditLogs.log('ESIGN_REJECTED', 'ESignRequest', id, actorId, { reason });
    return updated;
  }

  private async require(tenantId: string, id: string, allowed: ESignStatus[]) {
    const req = await this.prisma.eSignRequest.findFirst({ where: { id, tenantId } });
    if (!req) throw new NotFoundException('E-sign request not found');
    if (!allowed.includes(req.status)) {
      throw new ForbiddenException(`E-sign request is ${req.status} and cannot transition this way`);
    }
    return req;
  }
}
