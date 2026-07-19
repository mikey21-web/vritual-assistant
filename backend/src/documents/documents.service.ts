import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TimelineService } from '../timeline/timeline.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { DocumentTemplateStatus } from '@prisma/client';

/** Fills `{{variableName}}` placeholders. Missing variables are left as-is and reported, so a document is never silently sent with a blank/wrong value. */
function renderTemplate(body: string, variables: Record<string, string>): { rendered: string; missing: string[] } {
  const missing: string[] = [];
  const rendered = body.replace(/\{\{\s*(\w+)\s*\}\}/g, (_match, key) => {
    if (variables[key] == null) {
      missing.push(key);
      return `{{${key}}}`;
    }
    return String(variables[key]);
  });
  return { rendered, missing };
}

@Injectable()
export class DocumentsService {
  constructor(
    private prisma: PrismaService,
    private timeline: TimelineService,
    private auditLogs: AuditLogsService,
  ) {}

  // ── Templates ──────────────────────────────────────────────────────────────

  async createTemplate(tenantId: string, data: { name: string; documentType: string; bodyTemplate: string; variables?: string[] }) {
    return this.prisma.documentTemplate.create({
      data: { tenantId, name: data.name, documentType: data.documentType, bodyTemplate: data.bodyTemplate, variables: data.variables || [] },
    });
  }

  async findTemplates(tenantId: string, query: { documentType?: string; status?: string }) {
    const where: any = { tenantId };
    if (query.documentType) where.documentType = query.documentType;
    if (query.status) where.status = query.status;
    return this.prisma.documentTemplate.findMany({ where, orderBy: { createdAt: 'desc' } });
  }

  /** Owner/admin only — enforced by @Roles. An approved template's body is frozen; edit by creating a new version instead. */
  async approveTemplate(tenantId: string, id: string, approvedById?: string) {
    const template = await this.prisma.documentTemplate.findFirst({ where: { id, tenantId } });
    if (!template) throw new NotFoundException('Document template not found');
    if (template.status !== DocumentTemplateStatus.DRAFT) {
      throw new ForbiddenException(`Template is ${template.status} and cannot be approved`);
    }
    return this.prisma.documentTemplate.update({ where: { id }, data: { status: DocumentTemplateStatus.APPROVED, approvedById } });
  }

  async retireTemplate(tenantId: string, id: string) {
    const template = await this.prisma.documentTemplate.findFirst({ where: { id, tenantId } });
    if (!template) throw new NotFoundException('Document template not found');
    return this.prisma.documentTemplate.update({ where: { id }, data: { status: DocumentTemplateStatus.RETIRED } });
  }

  // ── Generation ─────────────────────────────────────────────────────────────

  /**
   * Renders and snapshots a document from an APPROVED template only (spec
   * 69.1) — a DRAFT template's wording hasn't been legal/finance-reviewed and
   * must never reach a buyer. The snapshot is permanent; a later template
   * edit never rewrites an already-issued document.
   */
  async generate(tenantId: string, data: { templateId: string; leadId: string; bookingId?: string; variables?: Record<string, string>; generatedById?: string }) {
    const template = await this.prisma.documentTemplate.findFirst({ where: { id: data.templateId, tenantId } });
    if (!template) throw new NotFoundException('Document template not found');
    if (template.status !== DocumentTemplateStatus.APPROVED) {
      throw new ForbiddenException(`Template is ${template.status}, not APPROVED — cannot generate from it`);
    }
    const lead = await this.prisma.lead.findFirst({ where: { id: data.leadId, tenantId }, include: { contact: true } });
    if (!lead) throw new NotFoundException('Lead not found');

    const variables: Record<string, string> = {
      buyerName: lead.contact?.name || '',
      ...(data.variables || {}),
    };
    const { rendered, missing } = renderTemplate(template.bodyTemplate, variables);
    if (missing.length > 0) {
      throw new BadRequestException(`Missing required variables: ${missing.join(', ')}`);
    }

    const doc = await this.prisma.generatedDocument.create({
      data: {
        tenantId,
        templateId: template.id,
        leadId: data.leadId,
        bookingId: data.bookingId,
        generatedById: data.generatedById,
        snapshot: { body: rendered, templateVersion: template.version, documentType: template.documentType, variables },
      },
    });

    await this.timeline.add({
      type: 'document_generated',
      title: `${template.documentType.replace(/_/g, ' ')} generated`,
      leadId: data.leadId,
      metadata: { generatedDocumentId: doc.id, templateId: template.id },
      createdById: data.generatedById,
    });
    await this.auditLogs.log('GENERATE', 'GeneratedDocument', doc.id, data.generatedById, { templateId: template.id });
    return doc;
  }

  /**
   * Demand letters are generated only from a due schedule and a tenant's own
   * APPROVED "DEMAND_LETTER" template (spec 20/48.11) — there is no built-in
   * default wording, since payment instructions/bank details/tax phrasing
   * must be the builder's own approved content, not something invented here.
   */
  async generateDemandLetter(tenantId: string, paymentScheduleId: string, generatedById?: string) {
    const schedule = await this.prisma.paymentSchedule.findFirst({ where: { id: paymentScheduleId, tenantId } });
    if (!schedule) throw new NotFoundException('Payment schedule not found');

    const template = await this.prisma.documentTemplate.findFirst({
      where: { tenantId, documentType: 'DEMAND_LETTER', status: DocumentTemplateStatus.APPROVED },
      orderBy: { version: 'desc' },
    });
    if (!template) {
      throw new BadRequestException('No approved DEMAND_LETTER template configured for this tenant — manual review required before one can be issued');
    }

    return this.generate(tenantId, {
      templateId: template.id,
      leadId: schedule.leadId,
      bookingId: schedule.bookingId || undefined,
      variables: {
        milestoneLabel: schedule.label,
        amountDue: new Intl.NumberFormat('en-IN', { style: 'currency', currency: schedule.currency, maximumFractionDigits: 0 }).format(schedule.amount),
        dueDate: schedule.dueDate ? schedule.dueDate.toLocaleDateString('en-IN') : 'on demand',
      },
      generatedById,
    });
  }

  /**
   * Generic booking-document generator (spec 69.1: booking form, allotment
   * letter, agreement, NOC, possession letter, handover checklist, CP
   * statement — all one shape, so one method, not six near-duplicates).
   * Auto-fills the variables every booking document needs; caller supplies
   * only what's specific to that documentType.
   */
  async generateFromBooking(tenantId: string, data: { documentType: string; bookingId: string; extraVariables?: Record<string, string>; generatedById?: string }) {
    const booking = await this.prisma.booking.findFirst({
      where: { id: data.bookingId, tenantId },
      include: { unit: { include: { project: true } }, applicants: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    const template = await this.prisma.documentTemplate.findFirst({
      where: { tenantId, documentType: data.documentType, status: DocumentTemplateStatus.APPROVED },
      orderBy: { version: 'desc' },
    });
    if (!template) {
      throw new BadRequestException(`No approved ${data.documentType} template configured for this tenant — manual review required before one can be issued`);
    }

    const primaryApplicant = booking.applicants.find(a => a.role === 'PRIMARY');
    return this.generate(tenantId, {
      templateId: template.id,
      leadId: booking.leadId,
      bookingId: booking.id,
      variables: {
        buyerName: primaryApplicant?.name || '',
        bookingNumber: booking.bookingNumber || '',
        unitNumber: booking.unit?.unitNumber || '',
        projectName: booking.unit?.project?.name || '',
        ...(data.extraVariables || {}),
      },
      generatedById: data.generatedById,
    });
  }

  async findGenerated(tenantId: string, query: { leadId?: string; bookingId?: string; page?: number; limit?: number }) {
    const { leadId, bookingId, page = 1, limit = 20 } = query;
    const where: any = { tenantId };
    if (leadId) where.leadId = leadId;
    if (bookingId) where.bookingId = bookingId;

    const [data, total] = await Promise.all([
      this.prisma.generatedDocument.findMany({ where, skip: (+page - 1) * +limit, take: +limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.generatedDocument.count({ where }),
    ]);
    return { data, meta: { total, page: +page, limit: +limit } };
  }

  async findOneGenerated(tenantId: string, id: string) {
    const doc = await this.prisma.generatedDocument.findFirst({ where: { id, tenantId } });
    if (!doc) throw new NotFoundException('Generated document not found');
    return doc;
  }
}
