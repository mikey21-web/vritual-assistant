import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class DocumentSearchService {
  constructor(
    private prisma: PrismaService,
    private auditLogs: AuditLogsService,
  ) {}

  async indexDocument(tenantId: string, data: {
    sourceType: string; sourceId: string; searchableText: string;
    leadId?: string; projectId?: string; unitId?: string;
  }) {
    const doc = await this.prisma.documentSearchIndex.create({
      data: { tenantId, sourceType: data.sourceType, sourceId: data.sourceId,
        searchableText: data.searchableText, leadId: data.leadId,
        projectId: data.projectId, unitId: data.unitId },
    });
    return doc;
  }

  async search(tenantId: string, query: string, filters?: {
    sourceType?: string; leadId?: string; projectId?: string; unitId?: string;
  }) {
    const where: any = { tenantId, searchableText: { contains: query, mode: 'insensitive' } };
    if (filters?.sourceType) where.sourceType = filters.sourceType;
    if (filters?.leadId) where.leadId = filters.leadId;
    if (filters?.projectId) where.projectId = filters.projectId;
    if (filters?.unitId) where.unitId = filters.unitId;

    return this.prisma.documentSearchIndex.findMany({
      where, orderBy: { updatedAt: 'desc' },
    });
  }

  async findByEntity(tenantId: string, sourceType: string, sourceId?: string) {
    const where: any = { tenantId, sourceType };
    if (sourceId) where.sourceId = sourceId;

    return this.prisma.documentSearchIndex.findMany({
      where, orderBy: { updatedAt: 'desc' },
    });
  }

  async rebuildIndex(tenantId: string) {
    // Rebuild from MediaFile, GeneratedDocument, BuyerDocument etc.
    // Stub: count what would be indexed
    const [mediaFiles, generatedDocs] = await Promise.all([
      this.prisma.mediaFile.findMany({
        where: { uploadedBy: { tenantId } },
        select: { id: true, fileName: true, mimeType: true },
      }),
      Promise.resolve([] as any[]),
    ]);

    // Clear existing index for this tenant
    await this.prisma.documentSearchIndex.deleteMany({ where: { tenantId } });

    const created: any[] = [];
    for (const mf of mediaFiles) {
      const searchableText = `${mf.fileName} ${mf.mimeType || ''}`;
      const doc = await this.prisma.documentSearchIndex.create({
        data: { tenantId, sourceType: 'MEDIA_FILE', sourceId: mf.id, searchableText },
      });
      created.push(doc);
    }

    return { indexed: created.length, source: 'media_file' };
  }

  async deleteDocument(tenantId: string, id: string) {
    const doc = await this.prisma.documentSearchIndex.findFirst({ where: { id, tenantId } });
    if (!doc) throw new NotFoundException('Document not found');

    await this.prisma.documentSearchIndex.delete({ where: { id } });
    return { deleted: true };
  }

  async getStorageStats(tenantId: string) {
    const [totalDocs, bySourceType] = await Promise.all([
      this.prisma.documentSearchIndex.count({ where: { tenantId } }),
      this.prisma.documentSearchIndex.groupBy({
        by: ['sourceType'], where: { tenantId }, _count: true,
      }),
    ]);

    return {
      totalDocuments: totalDocs,
      bySourceType: bySourceType.map(e => ({ sourceType: e.sourceType, count: e._count })),
    };
  }
}
