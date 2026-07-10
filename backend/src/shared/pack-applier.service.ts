import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AppliedRecord { table: string; id: string; }

/**
 * PackApplierService — provisions configuration packs into the database.
 *
 * Single-tenant: records are created without tenant scoping.
 */
@Injectable()
export class PackApplierService {
  private readonly logger = new Logger(PackApplierService.name);

  constructor(private prisma: PrismaService) {}

  async apply(pack: any, options?: {
    userId?: string;
  }): Promise<{ ids: string[]; records: AppliedRecord[] }> {
    const userId = options?.userId;
    const ids: string[] = [];
    const records: AppliedRecord[] = [];
    const add = (table: string, id: string) => { ids.push(id); records.push({ table, id }); };
    const payload = pack.payload || {};

    switch (pack.type) {
      case 'custom_fields':
        for (const f of payload.fields || []) {
          const { label, ...rest } = f;
          const data = { ...rest, name: f.name || label, target: f.target || 'LEAD', active: true };
          const key = data.key;
          const target = data.target;
          const created = await this.prisma.customFieldDefinition.upsert({
            where: { key_target: { key, target } },
            create: data,
            update: data,
          });
          add('customFieldDefinition', created.id);
        }
        break;
      case 'pipeline_stages':
        for (const s of payload.stages || []) {
          const { status, ...rest } = s;
          const created = await this.prisma.pipelineStage.upsert({
            where: { status },
            create: { ...rest, status },
            update: { ...rest },
          });
          add('pipelineStage', created.id);
        }
        break;
      case 'campaigns':
        for (const c of payload.campaigns || []) {
          const created = await this.prisma.campaign.create({
            data: { ...c, creatorId: userId, assignedAgentId: userId } as any,
          });
          add('campaign', created.id);
        }
        break;
      case 'lead_forms':
        for (const f of payload.forms || []) {
          const { fields, ...formData } = f;
          const created = await this.prisma.leadForm.create({ data: { ...formData } });
          add('leadForm', created.id);
          if (fields) {
            for (const field of fields) {
              const fld = await this.prisma.leadFormField.create({ data: { ...field, formId: created.id } });
              add('leadFormField', fld.id);
            }
          }
        }
        break;
      case 'message_templates':
        for (const t of payload.templates || payload.messages || []) {
          const created = await this.prisma.messageTemplate.create({ data: { ...t, creatorId: userId } as any });
          add('messageTemplate', created.id);
        }
        break;
      case 'scoring_rules':
        for (const r of payload.rules || []) {
          const created = await this.prisma.scoringRule.create({ data: { ...r } });
          add('scoringRule', created.id);
        }
        break;
      case 'routing_rules':
        for (const r of payload.rules || []) {
          const created = await this.prisma.routingRule.create({ data: { ...r, active: true } as any });
          add('routingRule', created.id);
        }
        break;
      case 'automation_rules':
        for (const r of payload.rules || []) {
          const created = await this.prisma.automationRule.create({ data: { ...r, active: true } as any });
          add('automationRule', created.id);
        }
        break;
      case 'nurture_sequences':
        for (const seq of payload.sequences || []) {
          const { steps, ...seqData } = seq;
          const created = await this.prisma.nurtureSequence.create({ data: { ...seqData } as any });
          add('nurtureSequence', created.id);
          if (steps) {
            for (const step of steps) {
              const stp = await this.prisma.nurtureStep.create({ data: { ...step, sequenceId: created.id } as any });
              add('nurtureStep', stp.id);
            }
          }
        }
        break;
      case 'booking_settings':
        for (const b of payload.settings || []) {
          const created = await this.prisma.bookingSetting.create({ data: { ...b } as any });
          add('bookingSetting', created.id);
        }
        break;
      case 'crm_mappings':
        for (const m of payload.mappings || []) {
          const created = await this.prisma.crmMapping.create({ data: { ...m } as any });
          add('crmMapping', created.id);
        }
        break;
      case 'conversion_goals':
        this.logger.warn('Skipped conversion_goals pack: requires a lead, not suitable for template provisioning');
        break;
      case 'reports':
        if (!userId) throw new Error('userId is required for reports provisioning');
        for (const r of payload.reports || []) {
          const created = await this.prisma.savedFilter.create({
            data: { name: r.name, entity: 'report', filters: r, userId, isShared: true },
          });
          add('savedFilter', created.id);
        }
        break;
      case 'saved_filters':
        if (!userId) throw new Error('userId is required for saved_filters provisioning');
        for (const f of payload.filters || []) {
          const created = await this.prisma.savedFilter.create({
            data: { ...f, userId, isShared: f.isShared ?? false } as any,
          });
          add('savedFilter', created.id);
        }
        break;
      case 'dashboard_labels':
      case 'notification_rules':
      case 'sample_data':
        break;
      default:
        this.logger.warn(`Unknown pack type: ${pack.type} — skipping`);
    }

    return { ids, records };
  }

  async rollback(records: AppliedRecord[]): Promise<void> {
    const map: Record<string, any> = {
      customFieldDefinition: this.prisma.customFieldDefinition,
      pipelineStage: this.prisma.pipelineStage,
      campaign: this.prisma.campaign,
      leadForm: this.prisma.leadForm,
      leadFormField: this.prisma.leadFormField,
      messageTemplate: this.prisma.messageTemplate,
      scoringRule: this.prisma.scoringRule,
      routingRule: this.prisma.routingRule,
      automationRule: this.prisma.automationRule,
      nurtureSequence: this.prisma.nurtureSequence,
      nurtureStep: this.prisma.nurtureStep,
      bookingSetting: this.prisma.bookingSetting,
      crmMapping: this.prisma.crmMapping,
      conversion: this.prisma.conversion,
      savedFilter: this.prisma.savedFilter,
    };
    for (const rec of records.reverse()) {
      try {
        await (map[rec.table] as any).delete({ where: { id: rec.id } });
      } catch (e: any) {
        this.logger.error(`Rollback failed for ${rec.table}#${rec.id}: ${e.message}`);
      }
    }
  }
}
