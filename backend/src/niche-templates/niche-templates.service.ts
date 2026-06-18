import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { PackApplierService, AppliedRecord } from '../shared/pack-applier.service';

@Injectable()
export class NicheTemplatesService {
  private readonly logger = new Logger(NicheTemplatesService.name);

  constructor(
    private prisma: PrismaService,
    private auditLogs: AuditLogsService,
    private packApplier: PackApplierService,
  ) {}

  // === MASTER TEMPLATE CRUD ===
  async findAll() {
    return this.prisma.nicheTemplate.findMany({ orderBy: { industry: 'asc' }, include: { _count: { select: { packs: true } } } });
  }

  async findOne(id: string) {
    const t = await this.prisma.nicheTemplate.findUnique({ where: { id }, include: { packs: { orderBy: { order: 'asc' } } } });
    if (!t) throw new NotFoundException('Niche template not found');
    return t;
  }

  async findByKey(key: string) {
    return this.prisma.nicheTemplate.findUnique({ where: { key }, include: { packs: { orderBy: { order: 'asc' } } } });
  }

  async create(data: any) {
    const t = await this.prisma.nicheTemplate.create({ data: { ...data, config: data.config || {} } });
    await this.auditLogs.log('niche_template_created', 'NicheTemplate', t.id);
    return t;
  }

  async update(id: string, data: any) {
    await this.findOne(id);
    return this.prisma.nicheTemplate.update({ where: { id }, data: { ...data, updatedAt: new Date() } });
  }

  async delete(id: string) {
    await this.findOne(id);
    await this.prisma.nicheTemplate.delete({ where: { id } });
    await this.auditLogs.log('niche_template_deleted', 'NicheTemplate', id);
    return { deleted: true };
  }

  async publish(id: string) {
    const t = await this.findOne(id);
    if (t.status === 'published') throw new BadRequestException('Already published');
    return this.prisma.nicheTemplate.update({ where: { id }, data: { status: 'published', version: t.version + 1, updatedAt: new Date() } });
  }

  async clone(id: string, newKey: string, newName: string) {
    const src = await this.findOne(id);
    const clone = await this.prisma.nicheTemplate.create({
      data: { key: newKey, name: newName, description: src.description, industry: src.industry, version: 1, status: 'draft', config: src.config as any },
    });
    for (const pack of src.packs || []) {
      await this.prisma.nicheTemplatePack.create({
        data: { templateId: clone.id, type: pack.type, name: pack.name, payload: pack.payload as any, order: pack.order, active: pack.active },
      });
    }
    await this.auditLogs.log('niche_template_cloned', 'NicheTemplate', clone.id, undefined, { sourceId: id, sourceKey: src.key });
    return this.findOne(clone.id);
  }

  // === PACKS ===
  async addPack(templateId: string, data: { type: string; name: string; payload: any; order?: number }) {
    await this.findOne(templateId);
    return this.prisma.nicheTemplatePack.create({ data: { templateId, type: data.type, name: data.name, payload: data.payload, order: data.order || 0 } });
  }

  async updatePack(packId: string, data: any) {
    const p = await this.prisma.nicheTemplatePack.findUnique({ where: { id: packId } });
    if (!p) throw new NotFoundException('Pack not found');
    return this.prisma.nicheTemplatePack.update({ where: { id: packId }, data });
  }

  // === APPLY TEMPLATE TO CLIENT ===
  async apply(templateId: string, clientKey: string, userId?: string, tenantId?: string) {
    const template = await this.findOne(templateId);
    if (template.status !== 'published') throw new BadRequestException('Cannot apply a draft template. Publish it first.');

    const scope = tenantId || clientKey;

    const existing = await this.prisma.clientTemplateInstallation.findFirst({
      where: { templateId, status: 'installed', OR: [{ clientKey }, tenantId ? { tenantId } : {}] },
    });
    if (existing) throw new BadRequestException(`This template is already installed for "${clientKey}".`);

    const createdRecords: Record<string, string[]> = {};
    const allCreated: AppliedRecord[] = [];

    try {
      for (const pack of template.packs || []) {
        if (!pack.active) continue;
        const result = await this.packApplier.apply(pack, { tenantId: scope, userId });
        if (!createdRecords[pack.type]) createdRecords[pack.type] = [];
        createdRecords[pack.type].push(...result.ids);
        allCreated.push(...result.records);
      }

      const installation = await this.prisma.clientTemplateInstallation.create({
        data: {
          clientKey,
          tenantId: tenantId || null,
          templateId: template.id,
          templateVersion: template.version,
          status: 'installed',
          installedById: userId,
          configSnapshot: template.config as any,
          createdRecords: createdRecords as any,
        },
      });

      await this.auditLogs.log('niche_template_installed', 'ClientTemplateInstallation', installation.id, userId, { templateKey: template.key, clientKey, packsInstalled: Object.keys(createdRecords).length });
      return { installation, summary: this.buildSummary(template, createdRecords) };
    } catch (e: any) {
      await this.packApplier.rollback(allCreated);
      await this.prisma.clientTemplateInstallation.create({
        data: {
          clientKey,
          tenantId: tenantId || null,
          templateId: template.id,
          templateVersion: template.version,
          status: 'failed',
          installedById: userId,
          configSnapshot: template.config as any,
          createdRecords: {},
          errorMessage: e.message,
        },
      });
      throw new BadRequestException(`Template application failed: ${e.message}. All created records have been rolled back.`);
    }
  }

  // === DRY RUN (preview without creating) ===
  async dryRun(templateId: string, clientKey: string) {
    const template = await this.findOne(templateId);
    if (template.status !== 'published') throw new BadRequestException('Template not published');

    const preview: Record<string, { count: number; samples: any[] }> = {};
    let totalRecords = 0;

    for (const pack of template.packs || []) {
      if (!pack.active) continue;
      const payload = pack.payload as any;
      const samples: any[] = [];

      switch (pack.type) {
        case 'custom_fields':
          for (const f of payload.fields || []) { samples.push({ name: f.name, key: `${clientKey}_${f.key}`, type: f.type, target: f.target }); }
          break;
        case 'pipeline_stages':
          for (const s of payload.stages || []) { samples.push({ name: s.name, order: s.order, color: s.color }); }
          break;
        case 'campaigns':
          for (const c of payload.campaigns || []) { samples.push({ name: c.name, sourceType: c.sourceType }); }
          break;
        case 'lead_forms':
          for (const f of payload.forms || []) { samples.push({ name: f.name, fieldCount: f.fields?.length || 0 }); }
          break;
        case 'message_templates':
          for (const t of payload.templates || []) { samples.push({ name: t.name, channel: t.channel, type: t.type }); }
          break;
        case 'scoring_rules':
          for (const r of payload.rules || []) { samples.push({ name: r.name, field: r.field, points: r.points }); }
          break;
        case 'routing_rules':
          for (const r of payload.rules || []) { samples.push({ name: r.name }); }
          break;
        case 'automation_rules':
          for (const r of payload.rules || []) { samples.push({ name: r.name, eventType: r.eventType }); }
          break;
        case 'nurture_sequences':
          for (const seq of payload.sequences || []) { samples.push({ name: seq.name, stepCount: seq.steps?.length || 0 }); }
          break;
        case 'booking_settings':
          for (const b of payload.settings || []) { samples.push({ name: b.name, provider: b.provider }); }
          break;
        case 'crm_mappings':
          for (const m of payload.mappings || []) { samples.push({ name: m.name, crmType: m.crmType }); }
          break;
        case 'conversion_goals':
          for (const g of payload.goals || []) { samples.push({ name: g.name, destination: g.destination }); }
          break;
        case 'reports':
          for (const r of payload.reports || []) { samples.push({ name: r.name, type: r.type }); }
          break;
        case 'saved_filters':
          for (const f of payload.filters || []) { samples.push({ name: f.name, entity: f.entity }); }
          break;
        case 'dashboard_labels':
        case 'notification_rules':
        case 'sample_data':
          samples.push(payload);
          break;
      }

      const count = samples.length;
      totalRecords += count;
      preview[pack.type] = { count, samples: samples.slice(0, 3) };
    }

    return {
      template: { key: template.key, name: template.name, version: template.version, industry: template.industry },
      packs: Object.keys(preview).length,
      totalRecords,
      breakdown: preview,
    };
  }

  // === UPGRADE INSTALLATION ===
  async upgrade(templateId: string, clientKey: string, userId?: string, tenantId?: string) {
    const template = await this.findOne(templateId);
    if (template.status !== 'published') throw new BadRequestException('Template not published');

    const installation = await this.prisma.clientTemplateInstallation.findFirst({
      where: { clientKey, templateId, status: 'installed' },
      orderBy: { installedAt: 'desc' },
    });
    if (!installation) throw new NotFoundException('No installation found to upgrade');
    if (installation.templateVersion >= template.version) {
      throw new BadRequestException(`Already at version ${installation.templateVersion}. Template version: ${template.version}`);
    }

    const previousRecords = installation.createdRecords as Record<string, string[]> || {};
    const previousTypes = new Set(Object.keys(previousRecords));
    const newPacks = (template.packs || []).filter(p => p.active && !previousTypes.has(p.type));
    if (newPacks.length === 0) {
      throw new BadRequestException(`Already up to date. No new pack types available in v${template.version}.`);
    }

    const mergedRecords: Record<string, string[]> = { ...previousRecords };
    let addedCount = 0;

    const scope = tenantId || clientKey;

    for (const pack of newPacks) {
      const result = await this.packApplier.apply(pack, { tenantId: scope, userId });
      mergedRecords[pack.type] = [...(mergedRecords[pack.type] || []), ...result.ids];
      addedCount += result.ids.length;
    }

    const updated = await this.prisma.clientTemplateInstallation.update({
      where: { id: installation.id },
      data: {
        templateVersion: template.version,
        createdRecords: mergedRecords as any,
        configSnapshot: template.config as any,
      },
    });

    await this.auditLogs.log('niche_template_upgraded', 'ClientTemplateInstallation', installation.id, userId, {
      templateKey: template.key, clientKey, fromVersion: installation.templateVersion, toVersion: template.version, newRecords: addedCount,
    });

    return { installation: updated, newPacksInstalled: newPacks.length, newRecordsCreated: addedCount };
  }

  // === BUILD SUMMARY ===
  private buildSummary(template: any, createdRecords: Record<string, string[]>) {
    const summary: Record<string, number> = {};
    for (const [type, ids] of Object.entries(createdRecords)) {
      summary[type] = ids.length;
    }
    return { template: { key: template.key, name: template.name, version: template.version }, created: summary };
  }

  // === INSTALLATIONS ===
  async getInstallations(clientKey?: string) {
    const where: any = {};
    if (clientKey) where.clientKey = clientKey;
    return this.prisma.clientTemplateInstallation.findMany({
      where,
      orderBy: { installedAt: 'desc' },
      include: { template: { select: { key: true, name: true, industry: true } } },
    });
  }

  async getClientTemplate(clientKey: string) {
    const inst = await this.prisma.clientTemplateInstallation.findFirst({
      where: { clientKey, status: 'installed' },
      orderBy: { installedAt: 'desc' },
      include: { template: { select: { key: true, name: true, industry: true } } },
    });
    if (!inst) throw new NotFoundException('No template installed for this client');

    // Load the full template with packs for the agent
    const template = await this.prisma.nicheTemplate.findUnique({
      where: { id: inst.templateId },
      include: { packs: { where: { active: true }, orderBy: { order: 'asc' } } },
    });

    return {
      clientKey: inst.clientKey,
      tenantId: inst.tenantId,
      status: inst.status,
      installedAt: inst.installedAt,
      configSnapshot: inst.configSnapshot,
      template: template ? {
        id: template.id,
        key: template.key,
        name: template.name,
        industry: template.industry,
        version: template.version,
        packs: (template.packs || []).map(p => ({
          type: p.type,
          name: p.name,
          payload: p.payload,
          order: p.order,
        })),
      } : inst.template,
    };
  }
}
