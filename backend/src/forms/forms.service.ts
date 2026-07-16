import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ContactsService } from '../contacts/contacts.service';
import { LeadsService } from '../leads/leads.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

/** Keys that are stripped from the submission payload before storing as form field data. */
const SUBMISSION_META_KEYS = ['_source', '_pageUrl', '_utm', '_startedAt', '_completedAt'];

@Injectable()
export class FormsService {
  constructor(
    private prisma: PrismaService,
    private contactsService: ContactsService,
    private leadsService: LeadsService,
    private auditLogs: AuditLogsService,
  ) {}

  findAll() {
    return this.prisma.leadForm.findMany({
      include: { fields: { orderBy: { displayOrder: 'asc' } } },
    });
  }

  async findOne(id: string) {
    const f = await this.prisma.leadForm.findUnique({
      where: { id },
      include: { fields: { orderBy: { displayOrder: 'asc' } } },
    });
    if (!f) throw new NotFoundException('Form not found');
    return f;
  }

  /**
   * Returns a form config suitable for public embed rendering.
   * Same data shape as findOne() but intended for unauthenticated access.
   */
  async findOnePublic(id: string) {
    return this.findOne(id);
  }

  async create(data: any, userId?: string) {
    const f = await this.prisma.leadForm.create({ data });
    await this.auditLogs.log('form_created', 'LeadForm', f.id, userId);
    return f;
  }

  async update(id: string, data: any, userId?: string) {
    await this.findOne(id);
    const f = await this.prisma.leadForm.update({ where: { id }, data });
    await this.auditLogs.log('form_updated', 'LeadForm', id, userId);
    return f;
  }

  addField(formId: string, data: any) {
    return this.prisma.leadFormField.create({ data: { ...data, formId } });
  }

  async updateField(formId: string, fieldId: string, data: any) {
    return this.prisma.leadFormField.update({ where: { id: fieldId }, data });
  }

  async deleteField(formId: string, fieldId: string) {
    return this.prisma.leadFormField.delete({ where: { id: fieldId } });
  }

  // ── Submission ─────────────────────────────────────────────────────────────

  async submit(formId: string, payload: any, req?: any) {
    await this.findOne(formId);

    const contact = await this.contactsService.findOrCreate({
      name: payload.name,
      email: payload.email,
      phone: payload.phone,
      whatsapp: payload.whatsapp,
      company: payload.company,
    }, req);

    // Only trust a client-supplied qrCodeId if it's a real QR code, so a made-up id
    // can't misattribute a lead's source.
    const leadSource = payload.qrCodeId
      && (await this.prisma.qrCode.findUnique({ where: { id: payload.qrCodeId } }))
      ? 'QR_CODE' : 'FORM';

    const lead = await this.leadsService.create({
      contactId: contact.id,
      source: leadSource,
      message: payload.message,
      interest: payload.interest,
      metadata: payload,
    });

    // Strip prefixed meta keys — they are submission metadata, not form field values
    const cleanPayload = this.stripMetaKeys(payload);

    // Submission tracking metadata
    const completed = Boolean(payload._completedAt);
    const startedAt = payload._startedAt ? new Date(payload._startedAt) : null;
    const completedAt = payload._completedAt ? new Date(payload._completedAt) : null;

    await this.prisma.formSubmission.create({
      data: {
        formId,
        payload: cleanPayload,
        leadId: lead.id,
        source: payload._source || 'direct',
        pageUrl: payload._pageUrl || null,
        utm: payload._utm || {},
        completed,
        startedAt,
        completedAt,
      },
    });

    await this.auditLogs.log('form_submitted', 'LeadForm', formId);
    return { data: { lead, contact } };
  }

  // ── Submissions listing (authenticated) ─────────────────────────────────────

  async findSubmissions(formId: string, query: {
    page?: number;
    limit?: number;
    source?: string;
    search?: string;
    completed?: string;
    dateFrom?: string;
    dateTo?: string;
  } = {}) {
    // Verify form exists
    await this.findOne(formId);

    const { page = 1, limit = 20, source, search, completed, dateFrom, dateTo } = query;

    const where: any = { formId };

    if (source) {
      where.source = source;
    }

    if (completed !== undefined && completed !== '') {
      where.completed = completed === 'true';
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    // If searching, look up by lead contact info (payload is JSON — not easily searchable)
    if (search) {
      where.lead = {
        contact: {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
            { phone: { contains: search } },
          ],
        },
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.formSubmission.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { lead: { include: { contact: true } } },
      }),
      this.prisma.formSubmission.count({ where }),
    ]);

    return { data, meta: { total, page, limit } };
  }

  // ── Analytics ───────────────────────────────────────────────────────────────

  async getAnalytics(formId: string) {
    // Verify form exists
    const form = await this.findOne(formId);

    const [totalSubmissions, completedCount, sourceBreakdown] = await Promise.all([
      this.prisma.formSubmission.count({ where: { formId } }),
      this.prisma.formSubmission.count({ where: { formId, completed: true } }),
      this.prisma.formSubmission.groupBy({
        by: ['source'],
        where: { formId },
        _count: { source: true },
      }),
    ]);

    const completionRate = totalSubmissions > 0
      ? Math.round((completedCount / totalSubmissions) * 10000) / 100
      : 0;

    // ── Field drop-off (multi-step awareness) ──
    // Count how many submissions have data for each step's fields, which tells
    // us at which step users tend to abandon the form.
    const fieldDropOff = await this.computeFieldDropOff(formId, form);

    // ── Trends: submissions per day over the last 30 days ──
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentSubmissions = await this.prisma.formSubmission.findMany({
      where: { formId, createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true, completed: true },
      orderBy: { createdAt: 'asc' },
    });

    const trendsMap = new Map<string, { count: number; completed: number }>();
    for (const sub of recentSubmissions) {
      const date = sub.createdAt.toISOString().split('T')[0];
      const entry = trendsMap.get(date) || { count: 0, completed: 0 };
      entry.count++;
      if (sub.completed) entry.completed++;
      trendsMap.set(date, entry);
    }

    const trends = Array.from(trendsMap.entries()).map(([date, data]) => ({
      date,
      ...data,
    }));

    return {
      totalSubmissions,
      completionRate,
      sourceBreakdown: sourceBreakdown.map((s) => ({
        source: s.source,
        count: s._count.source,
      })),
      fieldDropOff,
      trends,
    };
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  private stripMetaKeys(payload: Record<string, any>): Record<string, any> {
    return Object.fromEntries(
      Object.entries(payload).filter(([key]) => !SUBMISSION_META_KEYS.includes(key)),
    );
  }

  /** Determine how many submissions reached each step (or field, if no steps). */
  private async computeFieldDropOff(
    formId: string,
    form: any,
  ): Promise<Record<string, number>> {
    const dropOff: Record<string, number> = {};

    // Group fields by step
    const fieldsByStep: Record<string, string[]> = {};
    for (const field of form.fields || []) {
      const stepId = field.stepId || '__default__';
      if (!fieldsByStep[stepId]) fieldsByStep[stepId] = [];
      fieldsByStep[stepId].push(field.fieldKey);
    }

    if (Object.keys(fieldsByStep).length === 0) return dropOff;

    // Fetch all payloads for this form
    const submissions = await this.prisma.formSubmission.findMany({
      where: { formId },
      select: { payload: true },
    });

    for (const [stepId, fieldKeys] of Object.entries(fieldsByStep)) {
      let reached = 0;
      for (const sub of submissions) {
        const p = sub.payload as Record<string, any>;
        const hasData = fieldKeys.some(
          (key) => p[key] !== undefined && p[key] !== null && p[key] !== '',
        );
        if (hasData) reached++;
      }
      dropOff[stepId] = reached;
    }

    return dropOff;
  }
}
