import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HubspotAdapter, SalesforceAdapter, ZohoAdapter } from '../shared/adapters/crm.adapter';

@Injectable()
export class CrmMappingsService {
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
  create(data: any) { return this.prisma.crmMapping.create({ data }); }
  async update(id: string, data: any) { const m = await this.prisma.crmMapping.findUnique({ where: { id } }); if (!m) throw new NotFoundException('CRM mapping not found'); return this.prisma.crmMapping.update({ where: { id }, data }); }

  async test(id: string) {
    const m = await this.prisma.crmMapping.findUnique({ where: { id } });
    if (!m) throw new NotFoundException('CRM mapping not found');

    const crmType = m.crmType?.toLowerCase();
    let adapter: HubspotAdapter | SalesforceAdapter | ZohoAdapter;

    if (crmType === 'salesforce') adapter = this.salesforce;
    else if (crmType === 'zoho') adapter = this.zoho;
    else adapter = this.hubspot;

    const healthy = await adapter.healthCheck(m.fieldMappings as any);

    return {
      mapping: { id: m.id, name: m.name, crmType: m.crmType },
      healthy,
      test: healthy ? 'success' : 'failed',
      message: healthy ? 'CRM connection verified' : 'CRM unreachable — check credentials',
    };
  }
}
