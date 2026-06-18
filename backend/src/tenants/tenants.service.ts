import { Injectable, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { PackApplierService, AppliedRecord } from '../shared/pack-applier.service';

@Injectable()
export class TenantsService {
  constructor(
    private prisma: PrismaService,
    private auditLogs: AuditLogsService,
    private packApplier: PackApplierService,
  ) {}

  async findAll(page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [tenants, total] = await Promise.all([
      this.prisma.tenant.findMany({
        skip,
        take: limit,
        include: {
          users: { select: { id: true, name: true, email: true, role: true } },
          installations: { include: { template: { select: { key: true, name: true, industry: true } } }, take: 3 },
          _count: { select: { users: true, leads: true, campaigns: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.tenant.count(),
    ]);
    return { data: tenants, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    return this.prisma.tenant.findUniqueOrThrow({ where: { id } });
  }

  async findByKey(key: string) {
    return this.prisma.tenant.findUnique({ where: { key } });
  }

  async create(data: { key: string; name: string; industry: string; contactEmail?: string; contactName?: string }) {
    const existing = await this.prisma.tenant.findUnique({ where: { key: data.key } });
    if (existing) throw new BadRequestException('Tenant key already exists');
    const tenant = await this.prisma.tenant.create({
      data: { ...data, status: 'pending' },
    });
    await this.auditLogs.log('tenant_created', 'Tenant', tenant.id);
    return tenant;
  }

  async update(id: string, data: { name?: string; status?: string; contactEmail?: string; contactName?: string; config?: any }) {
    const tenant = await this.prisma.tenant.update({ where: { id }, data });
    await this.auditLogs.log('tenant_updated', 'Tenant', id);
    return tenant;
  }

  async delete(id: string, purgeData = false) {
    if (!purgeData) {
      const leadCount = await this.prisma.lead.count({ where: { tenantId: id } });
      if (leadCount > 0) {
        throw new BadRequestException('Tenant has existing leads. Use purgeData=true or delete leads first.');
      }
      const userCount = await this.prisma.user.count({ where: { tenantId: id } });
      if (userCount > 0) {
        throw new BadRequestException('Tenant has users. Delete users first or use purgeData=true.');
      }
      await this.prisma.tenant.delete({ where: { id } });
      await this.auditLogs.log('tenant_deleted', 'Tenant', id);
      return { deleted: true };
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.workflowStepRun.deleteMany({ where: { workflowInstance: { lead: { tenantId: id } } } });
      await tx.workflowInstance.deleteMany({ where: { lead: { tenantId: id } } });
      await tx.nurtureProgress.deleteMany({ where: { lead: { tenantId: id } } });
      await tx.scoreLog.deleteMany({ where: { lead: { tenantId: id } } });
      await tx.internalNote.deleteMany({ where: { lead: { tenantId: id } } });
      await tx.revenueRecord.deleteMany({ where: { tenantId: id } });
      await tx.conversationMessage.deleteMany({ where: { tenantId: id } });
      await tx.task.deleteMany({ where: { tenantId: id } });
      await tx.mediaFile.deleteMany({ where: { tenantId: id } });
      await tx.leadOwnershipHistory.deleteMany({ where: { lead: { tenantId: id } } });
      await tx.failureRecord.deleteMany({ where: { lead: { tenantId: id } } });
      await tx.systemEvent.deleteMany({ where: { OR: [{ lead: { tenantId: id } }, { contact: { tenantId: id } }] } });
      await tx.timelineItem.deleteMany({ where: { OR: [{ lead: { tenantId: id } }, { contact: { tenantId: id } }] } });
      await tx.ruleExecution.deleteMany({ where: { rule: { tenantId: id } } });
      await tx.conversion.deleteMany({ where: { tenantId: id } });
      await tx.formSubmission.deleteMany({ where: { form: { tenantId: id } } });
      await tx.leadFormField.deleteMany({ where: { form: { tenantId: id } } });
      await tx.nurtureStep.deleteMany({ where: { sequence: { tenantId: id } } });
      await tx.qrScan.deleteMany({ where: { qrCode: { tenantId: id } } });
      await tx.customFieldValue.deleteMany({ where: { OR: [{ contact: { tenantId: id } }, { lead: { tenantId: id } }] } });
      await tx.lead.deleteMany({ where: { tenantId: id } });
      await tx.contact.deleteMany({ where: { tenantId: id } });
      await tx.campaign.deleteMany({ where: { tenantId: id } });
      await tx.qrCode.deleteMany({ where: { tenantId: id } });
      await tx.leadForm.deleteMany({ where: { tenantId: id } });
      await tx.messageTemplate.deleteMany({ where: { tenantId: id } });
      await tx.nurtureSequence.deleteMany({ where: { tenantId: id } });
      await tx.scoringRule.deleteMany({ where: { tenantId: id } });
      await tx.routingRule.deleteMany({ where: { tenantId: id } });
      await tx.crmMapping.deleteMany({ where: { tenantId: id } });
      await tx.bookingSetting.deleteMany({ where: { tenantId: id } });
      await tx.customFieldDefinition.deleteMany({ where: { tenantId: id } });
      await tx.pipelineStage.deleteMany({ where: { tenantId: id } });
      await tx.automationRule.deleteMany({ where: { tenantId: id } });
      await tx.integration.deleteMany({ where: { tenantId: id } });
      await tx.blocklistEntry.deleteMany({ where: { tenantId: id } });
      await tx.slaRule.deleteMany({ where: { tenantId: id } });
      await tx.businessSettings.deleteMany({ where: { tenantId: id } });
      await tx.savedFilter.deleteMany({ where: { user: { tenantId: id } } });
      await tx.notificationPreference.deleteMany({ where: { user: { tenantId: id } } });
      await tx.importExportLog.deleteMany({ where: { user: { tenantId: id } } });
      await tx.clientTemplateInstallation.deleteMany({ where: { tenantId: id } });
      await tx.auditLog.deleteMany({ where: { tenantId: id } });
      await tx.user.deleteMany({ where: { tenantId: id } });
      await tx.tenant.delete({ where: { id } });
    });

    await this.auditLogs.log('tenant_deleted', 'Tenant', id);
    return { deleted: true };
  }

  async provision(
    tenantId: string,
    templateId: string,
    userId?: string,
    adminEmail?: string,
    adminPassword?: string,
    adminName?: string,
  ) {
    const tenant = await this.prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } });
    const template = await this.prisma.nicheTemplate.findUniqueOrThrow({
      where: { id: templateId },
      include: { packs: { where: { active: true }, orderBy: { order: 'asc' } } },
    });

    if (template.status !== 'published') {
      throw new BadRequestException('Only published templates can be provisioned');
    }

    if (adminEmail) {
      const existingUser = await this.prisma.user.findUnique({ where: { email: adminEmail } });
      if (existingUser) throw new BadRequestException('Admin email is already registered');
    }

    const createdRecords: Record<string, string[]> = {};
    const allCreated: AppliedRecord[] = [];
    let adminUserId: string | undefined;

    try {
      // provision packs that don't need a user reference first
      const userDependentTypes = ['campaigns', 'message_templates', 'reports', 'dashboard_labels'];
      const immediatePacks = template.packs.filter(p => !userDependentTypes.includes(p.type));
      const deferredPacks = template.packs.filter(p => userDependentTypes.includes(p.type));

      for (const pack of immediatePacks) {
        const result = await this.packApplier.apply(pack, { tenantId, userId });
        createdRecords[pack.type] = [...(createdRecords[pack.type] || []), ...result.ids];
        allCreated.push(...result.records);
      }

      // create admin user so deferred packs have a real userId
      if (adminEmail && adminPassword) {
        const hashed = await bcrypt.hash(adminPassword, 12);
        const adminUser = await this.prisma.user.create({
          data: { email: adminEmail, password: hashed, name: adminName || tenant.name, role: 'ADMIN', tenantId },
        });
        adminUserId = adminUser.id;
      }

      // provision packs that need user references
      const effectiveUserId = adminUserId || userId;
      for (const pack of deferredPacks) {
        const result = await this.packApplier.apply(pack, { tenantId, userId: effectiveUserId });
        createdRecords[pack.type] = [...(createdRecords[pack.type] || []), ...result.ids];
        allCreated.push(...result.records);
      }

      const installation = await this.prisma.clientTemplateInstallation.create({
        data: {
          clientKey: tenant.key,
          tenantId,
          templateId: template.id,
          templateVersion: template.version,
          status: 'installed',
          installedById: userId,
          configSnapshot: template.config ?? {},
          createdRecords,
        },
      });

      await this.prisma.tenant.update({
        where: { id: tenantId },
        data: { status: 'provisioned', provisioningTemplateId: templateId },
      });

      await this.auditLogs.log('tenant_provisioned', 'Tenant', tenantId, userId, {
        templateId,
        templateKey: template.key,
        summary: Object.fromEntries(Object.entries(createdRecords).map(([k, v]) => [k, v.length])),
      });

      return { installation, summary: createdRecords };
    } catch (e: any) {
      await this.packApplier.rollback(allCreated);
      await this.prisma.clientTemplateInstallation.create({
        data: {
          clientKey: tenant.key,
          tenantId,
          templateId: template.id,
          templateVersion: template.version,
          status: 'failed',
          installedById: userId,
          configSnapshot: template.config ?? {},
          createdRecords: {},
          errorMessage: e.message,
        },
      });
      throw new BadRequestException(`Provisioning failed: ${e.message}. All records rolled back.`);
    }
  }

  async getMyNiche(tenantId: string | null) {
    if (!tenantId) return { locked: false, reason: 'No tenant assigned' };

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        installations: {
          include: { template: { select: { id: true, key: true, name: true, industry: true, version: true } } },
          orderBy: { installedAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!tenant) return { locked: false, reason: 'Tenant not found' };

    const installation = tenant.installations[0];
    return {
      locked: true,
      tenant: { id: tenant.id, key: tenant.key, name: tenant.name, industry: tenant.industry, status: tenant.status },
      template: installation ? installation.template : null,
      installedVersion: installation?.templateVersion,
      installedAt: installation?.installedAt,
    };
  }
}
