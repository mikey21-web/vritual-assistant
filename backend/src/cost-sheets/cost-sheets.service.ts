import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TimelineService } from '../timeline/timeline.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CostSheetStatus } from '@prisma/client';

const EDITABLE_STATUSES: CostSheetStatus[] = [CostSheetStatus.DRAFT];

@Injectable()
export class CostSheetsService {
  constructor(
    private prisma: PrismaService,
    private timeline: TimelineService,
    private auditLogs: AuditLogsService,
  ) {}

  /**
   * Seed a draft with the unit's base price as the first line item — sales
   * then adds floor rise/PLC/parking/etc. before submitting for approval.
   * Nothing here is final: totals stay editable until the sheet is APPROVED.
   */
  async create(data: {
    tenantId: string;
    leadId: string;
    unitId: string;
    projectId: string;
    createdById?: string;
    lineItems?: { code: string; label: string; calculationType?: string; amountPaise: number; taxable?: boolean; displayOrder?: number }[];
  }) {
    const unit = await this.prisma.unit.findFirst({ where: { id: data.unitId, tenantId: data.tenantId } });
    if (!unit) throw new NotFoundException('Unit not found');
    const lead = await this.prisma.lead.findFirst({ where: { id: data.leadId, tenantId: data.tenantId } });
    if (!lead) throw new NotFoundException('Lead not found');

    const lineItems = data.lineItems && data.lineItems.length > 0
      ? data.lineItems
      : [{ code: 'BASE', label: 'Base consideration', calculationType: 'FLAT', amountPaise: Math.round((unit.price || 0) * 100), taxable: false, displayOrder: 0 }];

    const totalPaise = lineItems.reduce((sum, li) => sum + BigInt(li.amountPaise), BigInt(0));

    // Mark any still-open sheet for this lead/unit superseded — only one
    // sheet should be "live" at a time so sales never negotiates off a stale one.
    await this.prisma.costSheet.updateMany({
      where: { leadId: data.leadId, unitId: data.unitId, status: { in: [CostSheetStatus.DRAFT, CostSheetStatus.PENDING_APPROVAL, CostSheetStatus.APPROVED] } },
      data: { status: CostSheetStatus.SUPERSEDED },
    });

    const sheet = await this.prisma.costSheet.create({
      data: {
        tenantId: data.tenantId,
        leadId: data.leadId,
        unitId: data.unitId,
        projectId: data.projectId,
        totalPaise,
        createdById: data.createdById,
        lineItems: {
          create: lineItems.map((li, i) => ({
            code: li.code,
            label: li.label,
            calculationType: li.calculationType || 'FLAT',
            amountPaise: BigInt(li.amountPaise),
            taxable: li.taxable || false,
            displayOrder: li.displayOrder ?? i,
          })),
        },
      },
      include: { lineItems: { orderBy: { displayOrder: 'asc' } } },
    });

    await this.timeline.add({
      type: 'cost_sheet_created',
      title: 'Cost sheet drafted',
      leadId: data.leadId,
      metadata: { costSheetId: sheet.id, unitId: data.unitId },
      createdById: data.createdById,
    });
    await this.auditLogs.log('CREATE', 'CostSheet', sheet.id, data.createdById, { after: this.serializable(sheet) });

    return this.serializable(sheet);
  }

  async findAll(tenantId: string, query: { leadId?: string; unitId?: string; status?: string; page?: number; limit?: number }) {
    const { leadId, unitId, status, page = 1, limit = 20 } = query;
    const where: any = { tenantId };
    if (leadId) where.leadId = leadId;
    if (unitId) where.unitId = unitId;
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.prisma.costSheet.findMany({
        where,
        skip: (+page - 1) * +limit,
        take: +limit,
        orderBy: { createdAt: 'desc' },
        include: { lineItems: { orderBy: { displayOrder: 'asc' } } },
      }),
      this.prisma.costSheet.count({ where }),
    ]);
    return { data: data.map(s => this.serializable(s)), meta: { total, page: +page, limit: +limit } };
  }

  async findOne(tenantId: string, id: string) {
    const sheet: any = await this.prisma.costSheet.findFirst({
      where: { id, tenantId },
      include: { lineItems: { orderBy: { displayOrder: 'asc' } }, offers: true },
    });
    if (!sheet) throw new NotFoundException('Cost sheet not found');
    return this.serializable(sheet);
  }

  async replaceLineItems(tenantId: string, id: string, lineItems: { code: string; label: string; calculationType?: string; amountPaise: number; taxable?: boolean; displayOrder?: number }[], actorId?: string) {
    const sheet = await this.requireStatus(tenantId, id, EDITABLE_STATUSES);
    const totalPaise = lineItems.reduce((sum, li) => sum + BigInt(li.amountPaise), BigInt(0));

    await this.prisma.$transaction([
      this.prisma.costSheetLineItem.deleteMany({ where: { costSheetId: id } }),
      this.prisma.costSheetLineItem.createMany({
        data: lineItems.map((li, i) => ({
          costSheetId: id,
          code: li.code,
          label: li.label,
          calculationType: li.calculationType || 'FLAT',
          amountPaise: BigInt(li.amountPaise),
          taxable: li.taxable || false,
          displayOrder: li.displayOrder ?? i,
        })),
      }),
      this.prisma.costSheet.update({ where: { id }, data: { totalPaise } }),
    ]);

    await this.auditLogs.log('UPDATE_LINE_ITEMS', 'CostSheet', id, actorId, { before: sheet.lineItems, totalPaise: totalPaise.toString() });
    return this.findOne(tenantId, id);
  }

  async submit(tenantId: string, id: string, actorId?: string) {
    const sheet = await this.requireStatus(tenantId, id, EDITABLE_STATUSES);
    const updated = await this.prisma.costSheet.update({ where: { id: sheet.id }, data: { status: CostSheetStatus.PENDING_APPROVAL } });
    await this.timeline.add({ type: 'cost_sheet_submitted', title: 'Cost sheet submitted for approval', leadId: sheet.leadId, metadata: { costSheetId: id }, createdById: actorId });
    return this.serializable(updated);
  }

  /** Manager/owner only — enforced by @Roles at the controller. */
  async approve(tenantId: string, id: string, actorId?: string) {
    const sheet = await this.requireStatus(tenantId, id, [CostSheetStatus.PENDING_APPROVAL]);
    const full = await this.prisma.costSheet.findUniqueOrThrow({ where: { id }, include: { lineItems: true } });
    const updated = await this.prisma.costSheet.update({
      where: { id: sheet.id },
      data: {
        status: CostSheetStatus.APPROVED,
        approvedById: actorId,
        snapshot: JSON.parse(JSON.stringify(full.lineItems, (_k, v) => (typeof v === 'bigint' ? v.toString() : v))),
      },
    });
    await this.timeline.add({ type: 'cost_sheet_approved', title: 'Cost sheet approved', leadId: sheet.leadId, metadata: { costSheetId: id }, createdById: actorId });
    await this.auditLogs.log('APPROVE', 'CostSheet', id, actorId, {});
    return this.serializable(updated);
  }

  /** Locks the sheet — an already-sent sheet's snapshot can never change, even if prices move later. */
  async send(tenantId: string, id: string, actorId?: string) {
    const sheet = await this.requireStatus(tenantId, id, [CostSheetStatus.APPROVED]);
    const updated = await this.prisma.costSheet.update({
      where: { id: sheet.id },
      data: { status: CostSheetStatus.SENT, expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
    });
    await this.timeline.add({ type: 'cost_sheet_sent', title: 'Cost sheet sent to buyer', leadId: sheet.leadId, metadata: { costSheetId: id }, createdById: actorId });
    await this.auditLogs.log('SEND', 'CostSheet', id, actorId, {});
    return this.serializable(updated);
  }

  async compareVersions(tenantId: string, id: string, otherId: string) {
    const a = await this.prisma.costSheet.findFirst({ where: { id, tenantId } });
    const b = await this.prisma.costSheet.findFirst({ where: { id: otherId, tenantId } });
    if (!a || !b) throw new NotFoundException('Cost sheet not found');
    const snapA = (a.snapshot || []) as any[];
    const snapB = (b.snapshot || []) as any[];
    const mapA = new Map(snapA.map((li: any) => [li.code, li]));
    const mapB = new Map(snapB.map((li: any) => [li.code, li]));
    const added = snapB.filter((li: any) => !mapA.has(li.code));
    const removed = snapA.filter((li: any) => !mapB.has(li.code));
    const changed = snapB.filter((li: any) => {
      const old = mapA.get(li.code);
      return old && (old.amountPaise !== li.amountPaise || old.label !== li.label);
    }).map((li: any) => ({ code: li.code, label: li.label, oldAmountPaise: mapA.get(li.code)?.amountPaise, newAmountPaise: li.amountPaise }));
    return { sheetA: { id: a.id, status: a.status, createdAt: a.createdAt }, sheetB: { id: b.id, status: b.status, createdAt: b.createdAt }, diff: { added, removed, changed } };
  }

  async generatePrintHtml(tenantId: string, id: string) {
    const sheet: any = await this.prisma.costSheet.findFirst({
      where: { id, tenantId },
      include: { lineItems: true, unit: { select: { unitNumber: true, floor: true, unitType: true, areaSqft: true } }, project: { select: { name: true, location: true } }, lead: { select: { contact: { select: { name: true, phone: true } } } } },
    });
    if (!sheet) throw new NotFoundException('Cost sheet not found');
    const items = sheet.lineItems.map(li => `<tr><td>${li.code}</td><td>${li.label}</td><td style="text-align:right">${(Number(li.amountPaise) / 100).toLocaleString('en-IN')}</td></tr>`).join('\n');
    const total = (Number(sheet.totalPaise) / 100).toLocaleString('en-IN');
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Cost Sheet</title><style>
      body{font-family:Arial,sans-serif;max-width:800px;margin:40px auto;padding:20px;color:#333}
      h1{color:#1a365d;border-bottom:2px solid #2b6cb0;padding-bottom:8px}
      table{width:100%;border-collapse:collapse;margin:20px 0}
      th,td{padding:10px 12px;text-align:left;border-bottom:1px solid #e2e8f0}
      th{background:#f7fafc;font-weight:600}
      .total{font-size:1.2em;font-weight:700;border-top:2px solid #2b6cb0;padding-top:10px}
      .meta{color:#718096;font-size:0.9em;margin-bottom:20px}
      @media print{body{margin:0}p{page-break-after:always}}
    </style></head><body>
    <h1>Cost Sheet</h1>
    <div class="meta">Project: ${sheet.project?.name || 'N/A'} | Unit: ${sheet.unit?.unitNumber || 'N/A'} | Buyer: ${sheet.lead?.contact?.name || 'N/A'}</div>
    <table><thead><tr><th>Code</th><th>Description</th><th style="text-align:right">Amount (INR)</th></tr></thead><tbody>${items}</tbody></table>
    <div class="total">Total: ₹ ${total}</div>
    <p style="color:#718096;font-size:0.8em;margin-top:40px;text-align:center">Generated on ${new Date().toLocaleDateString('en-IN')}</p>
    </body></html>`;
  }

  computeLineItemAmount(calculationType: string, amountPaise: number, basePrice: number, superBuiltUpArea: number) {
    switch (calculationType) {
      case 'PER_SQFT': return Math.round(amountPaise * superBuiltUpArea);
      case 'PERCENT': return Math.round(basePrice * amountPaise / 100);
      case 'FLAT': default: return amountPaise;
    }
  }

  private async requireStatus(tenantId: string, id: string, allowed: CostSheetStatus[]) {
    const sheet: any = await this.prisma.costSheet.findFirst({ where: { id, tenantId }, include: { lineItems: true } });
    if (!sheet) throw new NotFoundException('Cost sheet not found');
    if (!allowed.includes(sheet.status)) {
      throw new ForbiddenException(`Cost sheet is ${sheet.status} and cannot be modified this way`);
    }
    return sheet;
  }

  /** BigInt doesn't survive JSON.stringify by default — stringify paise fields for API responses. */
  private serializable(sheet: any) {
    return {
      ...sheet,
      totalPaise: sheet.totalPaise?.toString(),
      lineItems: sheet.lineItems?.map((li: any) => ({ ...li, amountPaise: li.amountPaise?.toString() })),
    };
  }
}


