import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
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
    const sheet = await this.prisma.costSheet.findFirst({
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

  private async requireStatus(tenantId: string, id: string, allowed: CostSheetStatus[]) {
    const sheet = await this.prisma.costSheet.findFirst({ where: { id, tenantId }, include: { lineItems: true } });
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
