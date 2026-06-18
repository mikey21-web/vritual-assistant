import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { getCurrentTenantId } from '../shared/tenant-context.service';

const TENANT_MODELS = new Set([
  'lead', 'contact', 'campaign', 'task', 'leadForm', 'conversationMessage',
  'messageTemplate', 'mediaFile', 'nurtureSequence', 'scoringRule', 'routingRule',
  'integration', 'crmMapping', 'bookingSetting', 'conversion', 'pipelineStage',
  'automationRule', 'auditLog', 'customFieldDefinition', 'blocklistEntry',
  'slaRule', 'revenueRecord', 'businessSettings', 'notificationPreference',
  'savedFilter', 'importExportLog', 'qRCode',
]);

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super();
    this.$use(async (params, next) => {
      const model = (params.model as string)?.toLowerCase();
      const tenantId = getCurrentTenantId();

      if (tenantId && model && TENANT_MODELS.has(model)) {
        if (params.action === 'findMany' || params.action === 'findFirst' || params.action === 'count') {
          params.args.where = params.args.where || {};
          params.args.where.tenantId = tenantId;
        }
        if (params.action === 'findUnique') {
          params.args.where = { ...params.args.where, tenantId };
        }
        if (params.action === 'create' || params.action === 'createMany') {
          if (params.action === 'create') {
            params.args.data.tenantId = params.args.data.tenantId || tenantId;
          } else {
            params.args.data = params.args.data?.map((d: any) => ({ ...d, tenantId: d.tenantId || tenantId }));
          }
        }
        if (params.action === 'update' || params.action === 'updateMany' || params.action === 'delete' || params.action === 'deleteMany') {
          params.args.where = { ...params.args.where, tenantId };
        }
      }

      return next(params);
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

