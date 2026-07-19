import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class PhysicalDocumentsService {
  constructor(
    private prisma: PrismaService,
    private auditLogs: AuditLogsService,
  ) {}

  async createRecord(tenantId: string, data: {
    fileNumber: string; documentDescription: string; location: string;
    bookingId?: string; leadId?: string; dueBackAt?: string;
    scanLinkMediaFileId?: string; createdById?: string;
  }) {
    const doc = await this.prisma.physicalDocumentCustody.create({
      data: {
        tenantId, fileNumber: data.fileNumber, documentDescription: data.documentDescription,
        location: data.location, bookingId: data.bookingId, leadId: data.leadId,
        dueBackAt: data.dueBackAt ? new Date(data.dueBackAt) : null,
        scanLinkMediaFileId: data.scanLinkMediaFileId,
      },
    });
    await this.auditLogs.log('CREATE', 'PhysicalDocumentCustody', doc.id, data.createdById, { after: doc });
    return doc;
  }

  async findAll(tenantId: string, filters?: {
    leadId?: string; bookingId?: string; returned?: boolean;
  }) {
    const where: any = { tenantId };
    if (filters?.leadId) where.leadId = filters.leadId;
    if (filters?.bookingId) where.bookingId = filters.bookingId;
    if (filters?.returned !== undefined) {
      if (filters.returned) where.returnedAt = { not: null };
      else where.returnedAt = null;
    }

    return this.prisma.physicalDocumentCustody.findMany({
      where, orderBy: { updatedAt: 'desc' },
        include: { checkedOutBy: { select: { id: true, name: true } }, booking: { select: { bookingNumber: true, id: true, title: true } }, lead: { include: { contact: { select: { name: true } } } } },
    });
  }

  async findOne(tenantId: string, id: string) {
    const doc = await this.prisma.physicalDocumentCustody.findFirst({
      where: { id, tenantId },
      include: { checkedOutBy: { select: { name: true } }, booking: { select: { bookingNumber: true, id: true, title: true } }, lead: { include: { contact: { select: { name: true, phone: true } } } } },
    });
    if (!doc) throw new NotFoundException('Document record not found');
    return doc;
  }

  async checkOut(tenantId: string, docId: string, checkedOutById: string, dueBackAt?: string) {
    const doc = await this.prisma.physicalDocumentCustody.findFirst({ where: { id: docId, tenantId } });
    if (!doc) throw new NotFoundException('Document record not found');
    if (doc.checkedOutById) throw new BadRequestException('Document is already checked out');

    const updated = await this.prisma.physicalDocumentCustody.update({
      where: { id: docId },
      data: { checkedOutById, checkedOutAt: new Date(), dueBackAt: dueBackAt ? new Date(dueBackAt) : null },
    });
    await this.auditLogs.log('CHECK_OUT', 'PhysicalDocumentCustody', docId, checkedOutById, { before: doc, after: updated });
    return updated;
  }

  async checkIn(tenantId: string, docId: string, scanLinkMediaFileId?: string) {
    const doc = await this.prisma.physicalDocumentCustody.findFirst({ where: { id: docId, tenantId } });
    if (!doc) throw new NotFoundException('Document record not found');
    if (!doc.checkedOutById) throw new BadRequestException('Document is not checked out');

    const data: any = { checkedOutById: null, checkedOutAt: null, dueBackAt: null, returnedAt: new Date() };
    if (scanLinkMediaFileId) data.scanLinkMediaFileId = scanLinkMediaFileId;

    const updated = await this.prisma.physicalDocumentCustody.update({
      where: { id: docId }, data,
    });
    await this.auditLogs.log('CHECK_IN', 'PhysicalDocumentCustody', docId, undefined, { before: doc, after: updated });
    return updated;
  }

  async updateLocation(tenantId: string, docId: string, location: string) {
    const doc = await this.prisma.physicalDocumentCustody.findFirst({ where: { id: docId, tenantId } });
    if (!doc) throw new NotFoundException('Document record not found');

    const updated = await this.prisma.physicalDocumentCustody.update({
      where: { id: docId }, data: { location },
    });
    await this.auditLogs.log('UPDATE', 'PhysicalDocumentCustody', docId, undefined, { before: doc, after: updated });
    return updated;
  }

  async getLocationMap(tenantId: string) {
    const docs = await this.prisma.physicalDocumentCustody.findMany({
      where: { tenantId },
      select: { id: true, fileNumber: true, documentDescription: true, location: true, checkedOutById: true, returnedAt: true },
      orderBy: { location: 'asc' },
    });

    const byLocation: Record<string, any> = {};
    for (const d of docs) {
      const loc = d.location || 'Uncategorized';
      if (!byLocation[loc]) byLocation[loc] = { location: loc, documents: [] };
      byLocation[loc].documents.push(d);
    }

    return {
      totalDocuments: docs.length,
      checkedOut: docs.filter(d => d.checkedOutById).length,
      inStorage: docs.filter(d => !d.checkedOutById).length,
      locations: Object.values(byLocation),
    };
  }
}
