import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class AdvancedMarketingService {
  constructor(
    private prisma: PrismaService,
    private auditLogs: AuditLogsService,
  ) {}

  // --- Landing pages ---

  createLandingPage(tenantId: string, data: { projectId?: string; slug: string; title: string; content?: any; utmDefaults?: any; createdById?: string }) {
    return this.prisma.landingPage.create({
      data: {
        tenantId, projectId: data.projectId, slug: data.slug, title: data.title,
        content: data.content ?? {}, utmDefaults: data.utmDefaults ?? {}, createdById: data.createdById,
      },
    });
  }

  listLandingPages(tenantId: string, projectId?: string) {
    return this.prisma.landingPage.findMany({ where: { tenantId, ...(projectId ? { projectId } : {}) }, orderBy: { createdAt: 'desc' } });
  }

  async publishLandingPage(tenantId: string, id: string, actorId?: string) {
    const page = await this.prisma.landingPage.findFirst({ where: { id, tenantId } });
    if (!page) throw new NotFoundException('Landing page not found');
    if (page.status !== 'DRAFT') throw new ForbiddenException(`Page is ${page.status}, not DRAFT`);

    const updated = await this.prisma.landingPage.update({
      where: { id }, data: { status: 'PUBLISHED', publishedAt: new Date() },
    });
    await this.auditLogs.log('PUBLISH', 'LandingPage', id, actorId, {});
    return updated;
  }

  async getPublicLandingPage(tenantId: string, slug: string) {
    const page = await this.prisma.landingPage.findFirst({ where: { tenantId, slug, status: 'PUBLISHED' } });
    if (!page) throw new NotFoundException('Page not found');
    return page;
  }

  // --- Audience segments ---

  createSegment(tenantId: string, data: { name: string; filters?: any; createdById?: string }) {
    return this.prisma.audienceSegment.create({ data: { tenantId, name: data.name, filters: data.filters ?? {}, createdById: data.createdById } });
  }

  listSegments(tenantId: string) {
    return this.prisma.audienceSegment.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' } });
  }

  async previewSegment(tenantId: string, segmentId: string) {
    const segment = await this.prisma.audienceSegment.findFirst({ where: { id: segmentId, tenantId } });
    if (!segment) throw new NotFoundException('Segment not found');

    const where = this.buildLeadWhere(tenantId, segment.filters as any);
    const [count, sample] = await Promise.all([
      this.prisma.lead.count({ where }),
      this.prisma.lead.findMany({
        where, take: 10,
        select: { id: true, status: true, source: true, segment: true, contact: { select: { name: true, phone: true } } },
      }),
    ]);
    return { count, sample };
  }

  private buildLeadWhere(tenantId: string, filters: Record<string, any>) {
    const where: any = { tenantId };
    if (filters?.status) where.status = filters.status;
    if (filters?.source) where.source = filters.source;
    if (filters?.segment) where.segment = filters.segment;
    if (filters?.minDealValue || filters?.maxDealValue) {
      where.dealValue = {};
      if (filters.minDealValue) where.dealValue.gte = filters.minDealValue;
      if (filters.maxDealValue) where.dealValue.lte = filters.maxDealValue;
    }
    return where;
  }

  // --- Suppression list ---

  async addSuppression(tenantId: string, data: { channel: string; contactRef: string; reason?: string }) {
    return this.prisma.suppressionEntry.upsert({
      where: { tenantId_channel_contactRef: { tenantId, channel: data.channel as any, contactRef: data.contactRef } },
      update: { reason: data.reason },
      create: { tenantId, channel: data.channel as any, contactRef: data.contactRef, reason: data.reason },
    });
  }

  listSuppressions(tenantId: string, channel?: string) {
    return this.prisma.suppressionEntry.findMany({ where: { tenantId, ...(channel ? { channel: channel as any } : {}) }, orderBy: { createdAt: 'desc' } });
  }

  async isSuppressed(tenantId: string, channel: string, contactRef: string): Promise<boolean> {
    const entry = await this.prisma.suppressionEntry.findUnique({
      where: { tenantId_channel_contactRef: { tenantId, channel: channel as any, contactRef } },
    });
    return !!entry;
  }

  removeSuppression(tenantId: string, id: string) {
    return this.prisma.suppressionEntry.deleteMany({ where: { id, tenantId } });
  }

  // --- Ad spend import ---

  importSpend(tenantId: string, data: { projectId?: string; source: string; campaign?: string; spendDate: string; amountPaise: string; currency?: string; createdById?: string }) {
    return this.prisma.adSpendImport.create({
      data: {
        tenantId, projectId: data.projectId, source: data.source, campaign: data.campaign,
        spendDate: new Date(data.spendDate), amountPaise: BigInt(data.amountPaise),
        currency: data.currency ?? 'INR', createdById: data.createdById,
      },
    });
  }

  async getSpendReport(tenantId: string, projectId?: string) {
    const where: any = { tenantId, ...(projectId ? { projectId } : {}) };
    const grouped = await this.prisma.adSpendImport.groupBy({
      by: ['source'], where, _sum: { amountPaise: true },
    });
    const bySource = await Promise.all(grouped.map(async (g) => {
      const leadCount = await this.prisma.lead.count({ where: { tenantId, source: g.source as any, ...(projectId ? {} : {}) } });
      const spendPaise = Number(g._sum.amountPaise ?? 0n);
      return {
        source: g.source,
        spendPaise,
        leadCount,
        costPerLeadPaise: leadCount > 0 ? Math.round(spendPaise / leadCount) : null,
      };
    }));
    return bySource;
  }
}
