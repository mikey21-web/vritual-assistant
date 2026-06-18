import { Injectable, ForbiddenException, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { getTenantContext } from '../shared/tenant-context.service';

const TENANT_MODELS = new Set([
  'lead', 'contact', 'campaign', 'task', 'leadForm', 'conversationMessage',
  'messageTemplate', 'mediaFile', 'nurtureSequence', 'scoringRule', 'routingRule',
  'integration', 'crmMapping', 'bookingSetting', 'conversion', 'pipelineStage',
  'automationRule', 'auditLog', 'customFieldDefinition', 'blocklistEntry',
  'slaRule', 'revenueRecord', 'businessSettings', 'qRCode',
]);

const READ_ACTIONS = new Set([
  'findMany', 'findFirst', 'findFirstOrThrow', 'findUnique', 'findUniqueOrThrow',
  'count', 'aggregate', 'groupBy',
]);

const WRITE_ACTIONS = new Set([
  'create', 'createMany', 'upsert', 'update', 'updateMany', 'delete', 'deleteMany',
]);

const SENTINEL_TENANT = '__no_tenant__';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super();
    this.$use(async (params, next) => {
      const model = (params.model as string)?.toLowerCase();
      const action = params.action as string;

      if (!model || !TENANT_MODELS.has(model)) return next(params);

      const ctx = getTenantContext();

      if (READ_ACTIONS.has(action)) {
        if (ctx.isPlatformAdmin && !ctx.tenantId) {
          return next(params);
        }

        const filterTenantId = ctx.tenantId || SENTINEL_TENANT;

        if (action === 'findUnique' || action === 'findUniqueOrThrow') {
          params.args.where = { ...params.args.where, tenantId: filterTenantId };
        } else {
          params.args.where = params.args.where || {};
          params.args.where.tenantId = filterTenantId;
        }
        return next(params);
      }

      if (WRITE_ACTIONS.has(action)) {
        if (!ctx.tenantId && !ctx.isPlatformAdmin) {
          throw new ForbiddenException('Tenant context required for write operations');
        }

        if (action === 'create') {
          params.args.data.tenantId = ctx.isPlatformAdmin
            ? (params.args.data.tenantId || ctx.tenantId)
            : ctx.tenantId;
        } else if (action === 'createMany') {
          params.args.data = params.args.data?.map((d: any) => ({
            ...d,
            tenantId: ctx.isPlatformAdmin ? (d.tenantId || ctx.tenantId) : ctx.tenantId,
          }));
        } else if (action === 'upsert') {
          params.args.create.tenantId = ctx.isPlatformAdmin
            ? (params.args.create.tenantId || ctx.tenantId)
            : ctx.tenantId;
          if (!ctx.isPlatformAdmin) {
            params.args.where = { ...params.args.where, tenantId: ctx.tenantId };
          }
        }

        if (['update', 'updateMany', 'delete', 'deleteMany'].includes(action)) {
          if (ctx.tenantId && !ctx.isPlatformAdmin) {
            params.args.where = { ...params.args.where, tenantId: ctx.tenantId };
          }
        }

        return next(params);
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
