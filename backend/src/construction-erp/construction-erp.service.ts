import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class ConstructionErpService {
  constructor(
    private prisma: PrismaService,
    private auditLogs: AuditLogsService,
  ) {}

  async configureConnection(tenantId: string, data: {
    projectId: string; provider: string; config?: any;
  }) {
    const project = await this.prisma.project.findFirst({ where: { id: data.projectId, tenantId } });
    if (!project) throw new NotFoundException('Project not found');

    const connection = await this.prisma.constructionErpConnection.upsert({
      where: { tenantId_projectId: { tenantId, projectId: data.projectId } },
      create: { tenantId, projectId: data.projectId, provider: data.provider, config: data.config || {}, status: 'CONNECTED' },
      update: { provider: data.provider, config: data.config || {}, status: 'CONNECTED' },
    });
    await this.auditLogs.log('UPSERT', 'ConstructionErpConnection', connection.id, undefined, { after: connection });
    return connection;
  }

  async getConnections(tenantId: string) {
    return this.prisma.constructionErpConnection.findMany({
      where: { tenantId },
      include: { project: { select: { id: true, name: true } } },
    });
  }

  async recordMilestone(tenantId: string, data: {
    projectId: string; milestoneName: string; percentComplete: number;
    towerId?: string; sourceType?: string; reportedById?: string;
  }) {
    const project = await this.prisma.project.findFirst({ where: { id: data.projectId, tenantId } });
    if (!project) throw new NotFoundException('Project not found');

    const milestone = await this.prisma.constructionMilestoneUpdate.create({
      data: {
        tenantId, projectId: data.projectId, milestoneName: data.milestoneName,
        percentComplete: data.percentComplete, towerId: data.towerId,
        sourceType: data.sourceType || 'MANUAL', reportedById: data.reportedById,
      },
    });
    await this.auditLogs.log('CREATE', 'ConstructionMilestoneUpdate', milestone.id, undefined, { after: milestone });
    return milestone;
  }

  async getMilestones(tenantId: string, projectId: string) {
    const project = await this.prisma.project.findFirst({ where: { id: projectId, tenantId } });
    if (!project) throw new NotFoundException('Project not found');

    return this.prisma.constructionMilestoneUpdate.findMany({
      where: { tenantId, projectId },
      orderBy: { reportedAt: 'desc' },
      include: { tower: { select: { id: true, name: true } } },
    });
  }

  async handleWebhook(tenantId: string, provider: string, payload: any) {
    await this.auditLogs.log('PROCESS', 'ErpWebhook', undefined, undefined, { extra: { provider, payload } });
    return { received: true, provider, timestamp: new Date().toISOString() };
  }

  async getProjectProgress(projectId: string, tenantId?: string) {
    if (tenantId) {
      const p = await this.prisma.project.findFirst({ where: { id: projectId, tenantId } });
      if (!p) throw new NotFoundException('Project not found');
    }

    const milestones = await this.prisma.constructionMilestoneUpdate.findMany({
      where: { projectId },
      orderBy: { reportedAt: 'desc' },
    });

    const latestPct = milestones.length > 0 ? milestones[0].percentComplete : 0;
    const byTower: Record<string, any> = {};
    for (const m of milestones) {
      if (m.towerId) {
        if (!byTower[m.towerId]) byTower[m.towerId] = { towerId: m.towerId, milestones: [] };
        byTower[m.towerId].milestones.push(m);
      }
    }

    return {
      projectId,
      overallPercentComplete: latestPct,
      totalMilestones: milestones.length,
      byTower,
    };
  }

  /** Marketing/content approval is separate from the raw site upload (spec 68.1) — a milestone is buyer-visible only after this. */
  async approveForBuyers(tenantId: string, milestoneId: string, customerVisibleMessage: string, approvedById?: string) {
    const milestone = await this.prisma.constructionMilestoneUpdate.findFirst({ where: { id: milestoneId, tenantId } });
    if (!milestone) throw new NotFoundException('Milestone update not found');
    const updated = await this.prisma.constructionMilestoneUpdate.update({
      where: { id: milestoneId },
      data: { customerVisibleMessage, approvedForBuyersAt: new Date(), approvedForBuyersById: approvedById },
    });
    await this.auditLogs.log('APPROVE_FOR_BUYERS', 'ConstructionMilestoneUpdate', milestoneId, approvedById, {});
    return updated;
  }

  /** Only approved updates, never raw internal ones (spec 68.1 buyer portal rule). */
  async getBuyerVisibleMilestones(tenantId: string, projectId: string) {
    return this.prisma.constructionMilestoneUpdate.findMany({
      where: { tenantId, projectId, approvedForBuyersAt: { not: null } },
      orderBy: { reportedAt: 'desc' },
      select: { id: true, milestoneName: true, percentComplete: true, customerVisibleMessage: true, approvedForBuyersAt: true },
    });
  }
}
