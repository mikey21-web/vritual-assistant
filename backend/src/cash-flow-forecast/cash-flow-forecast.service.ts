import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class CashFlowForecastService {
  constructor(
    private prisma: PrismaService,
    private auditLogs: AuditLogsService,
  ) {}

  async createEntry(tenantId: string, data: {
    projectId: string; entryType: string; amountPaise: string;
    expectedDate: string; sourceType: string; sourceId?: string; notes?: string;
  }, createdById?: string) {
    const project = await this.prisma.project.findFirst({ where: { id: data.projectId, tenantId } });
    if (!project) throw new NotFoundException('Project not found');

    const entry = await this.prisma.cashFlowForecastEntry.create({
      data: {
        tenantId, projectId: data.projectId,
        entryType: data.entryType as any,
        amountPaise: BigInt(data.amountPaise),
        expectedDate: new Date(data.expectedDate),
        sourceType: data.sourceType, sourceId: data.sourceId, notes: data.notes,
        createdById,
      },
    });
    await this.auditLogs.log('CREATE', 'CashFlowForecastEntry', entry.id, createdById, { after: entry });
    return entry;
  }

  async findByProject(tenantId: string, projectId: string) {
    const project = await this.prisma.project.findFirst({ where: { id: projectId, tenantId } });
    if (!project) throw new NotFoundException('Project not found');

    return this.prisma.cashFlowForecastEntry.findMany({
      where: { tenantId, projectId },
      orderBy: { expectedDate: 'asc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const entry = await this.prisma.cashFlowForecastEntry.findFirst({ where: { id, tenantId } });
    if (!entry) throw new NotFoundException('Forecast entry not found');
    return entry;
  }

  async getProjectSummary(projectId: string, tenantId?: string) {
    if (tenantId) {
      const p = await this.prisma.project.findFirst({ where: { id: projectId, tenantId } });
      if (!p) throw new NotFoundException('Project not found');
    }

    const entries = await this.prisma.cashFlowForecastEntry.findMany({
      where: { projectId, tenantId },
      orderBy: { expectedDate: 'asc' },
    });

    const totalInflow = entries
      .filter(e => ['EXPECTED_COLLECTION'].includes(e.entryType))
      .reduce((s, e) => s + Number(e.amountPaise), 0);

    const totalOutflow = entries
      .filter(e => ['EXPECTED_COMMISSION_PAYOUT', 'EXPECTED_REFUND', 'PLANNED_EXPENSE'].includes(e.entryType))
      .reduce((s, e) => s + Number(e.amountPaise), 0);

    // Group by month
    const byMonth: Record<string, { month: string; inflows: bigint; outflows: bigint }> = {};
    for (const e of entries) {
      const monthKey = e.expectedDate.toISOString().slice(0, 7);
      if (!byMonth[monthKey]) byMonth[monthKey] = { month: monthKey, inflows: BigInt(0), outflows: BigInt(0) };
      if (e.entryType === 'EXPECTED_COLLECTION') {
        byMonth[monthKey].inflows += e.amountPaise;
      } else {
        byMonth[monthKey].outflows += e.amountPaise;
      }
    }

    return {
      projectId,
      totalExpectedInflowsPaise: BigInt(totalInflow),
      totalExpectedOutflowsPaise: BigInt(totalOutflow),
      netPositionPaise: BigInt(totalInflow - totalOutflow),
      entries,
      byMonth: Object.values(byMonth),
    };
  }

  async deleteEntry(tenantId: string, id: string) {
    const entry = await this.prisma.cashFlowForecastEntry.findFirst({ where: { id, tenantId } });
    if (!entry) throw new NotFoundException('Forecast entry not found');
    await this.prisma.cashFlowForecastEntry.delete({ where: { id } });
    await this.auditLogs.log('DELETE', 'CashFlowForecastEntry', id);
    return { deleted: true };
  }
}
