import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HubspotAdapter, SalesforceAdapter, ZohoAdapter } from '../shared/adapters/crm.adapter';
import { envelopeDecrypt } from '../shared/crypto.util';

const CRM_TYPE_MAP: Record<string, string> = {
  HUBSPOT: 'HUBSPOT',
  SALESFORCE: 'SALESFORCE',
  ZOHO: 'ZOHO',
};

@Injectable()
export class CrmMappingsService {
  private readonly logger = new Logger(CrmMappingsService.name);

  constructor(
    private prisma: PrismaService,
    private hubspot: HubspotAdapter,
    private salesforce: SalesforceAdapter,
    private zoho: ZohoAdapter,
  ) {}

  findAll(query: any = {}) {
    const { page = 1, limit = 50 } = query;
    return Promise.all([this.prisma.crmMapping.findMany({ skip: (+page - 1) * +limit, take: +limit, orderBy: { createdAt: 'desc' } }), this.prisma.crmMapping.count()]).then(([data, total]) => ({ data, meta: { total, page: +page, limit: +limit } }));
  }
  create(data: any) { return this.prisma.crmMapping.create({ data: { ...data, fieldMappings: data.fieldMappings ?? {} } }); }
  async update(id: string, data: any) { const m = await this.prisma.crmMapping.findUnique({ where: { id } }); if (!m) throw new NotFoundException('CRM mapping not found'); return this.prisma.crmMapping.update({ where: { id }, data }); }

  async test(id: string) {
    const m = await this.prisma.crmMapping.findUnique({ where: { id } });
    if (!m) throw new NotFoundException('CRM mapping not found');

    // 1. Validate fieldMappings is present and valid JSON
    let fieldMappings: Record<string, string> = {};
    if (!m.fieldMappings) {
      return {
        mapping: { id: m.id, name: m.name, crmType: m.crmType },
        healthy: false,
        test: 'failed',
        message: 'No field mappings configured. Add field mappings before testing.',
        fieldMappings: null,
      };
    }

    try {
      fieldMappings =
        typeof m.fieldMappings === 'string'
          ? JSON.parse(m.fieldMappings)
          : (m.fieldMappings as Record<string, string>);
    } catch {
      return {
        mapping: { id: m.id, name: m.name, crmType: m.crmType },
        healthy: false,
        test: 'failed',
        message: 'Field mappings contain invalid JSON. Check the field mapping format.',
        fieldMappings: null,
      };
    }

    if (Object.keys(fieldMappings).length === 0) {
      return {
        mapping: { id: m.id, name: m.name, crmType: m.crmType },
        healthy: false,
        test: 'failed',
        message: 'Field mappings are empty. Add at least one field mapping.',
        fieldMappings: fieldMappings,
      };
    }

    // 2. Map crmType to integration type key
    const normalizedType = m.crmType.toUpperCase();
    const integrationType = CRM_TYPE_MAP[normalizedType];
    if (!integrationType) {
      return {
        mapping: { id: m.id, name: m.name, crmType: m.crmType },
        healthy: false,
        test: 'failed',
        message: `Unknown CRM type "${m.crmType}". Supported types: HubSpot, Salesforce, Zoho.`,
        fieldMappings: fieldMappings,
      };
    }

    // 3. Find the Integration record matching this CRM type
    const integration = await this.prisma.integration.findFirst({
      where: { type: integrationType },
    });

    if (!integration) {
      return {
        mapping: { id: m.id, name: m.name, crmType: m.crmType },
        healthy: false,
        test: 'failed',
        message: `No ${m.crmType} integration configured. Go to Integrations page first.`,
        fieldMappings: fieldMappings,
      };
    }

    // 4. Decrypt the integration config
    const config = envelopeDecrypt(integration.config as any);

    // 5. Select correct adapter
    const crmTypeLower = m.crmType?.toLowerCase();
    let adapter: HubspotAdapter | SalesforceAdapter | ZohoAdapter;

    if (crmTypeLower === 'salesforce') adapter = this.salesforce;
    else if (crmTypeLower === 'zoho') adapter = this.zoho;
    else adapter = this.hubspot;

    // 6. Run health check with decrypted config (credentials)
    let healthy: boolean;
    try {
      healthy = await adapter.healthCheck(config);
    } catch (err: any) {
      this.logger.error(`Health check error for ${m.crmType} mapping ${m.id}: ${err.message}`);
      healthy = false;
    }

    return {
      mapping: { id: m.id, name: m.name, crmType: m.crmType },
      integration: { id: integration.id, name: integration.name, status: integration.status },
      healthy,
      test: healthy ? 'success' : 'failed',
      message: healthy
        ? 'CRM connection verified ✓'
        : `CRM unreachable — check ${m.crmType} credentials in Integrations settings.`,
      fieldMappings: fieldMappings,
      testedAt: new Date().toISOString(),
    };
  }
}
