import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HubspotAdapter, SalesforceAdapter, ZohoAdapter } from '../shared/adapters/crm.adapter';
import { encrypt, decrypt } from '../shared/crypto.util';

const SECRET_FIELDS = ['apiKey', 'apiSecret', 'secret', 'token', 'password', 'accessToken', 'privateKey', 'clientSecret', 'authToken', 'refreshToken'];

function redactSecrets(config: any): any {
  if (!config || typeof config !== 'object') return config;
  const result: any = Array.isArray(config) ? [] : {};
  for (const [key, value] of Object.entries(config)) {
    if (SECRET_FIELDS.includes(key)) result[key] = '***REDACTED***';
    else if (typeof value === 'object' && value !== null) result[key] = redactSecrets(value);
    else result[key] = value;
  }
  return result;
}

function envelopeEncrypt(config: any): any {
  if (!config || typeof config !== 'object') return config;
  const result: any = Array.isArray(config) ? [] : {};
  for (const [key, value] of Object.entries(config)) {
    if (SECRET_FIELDS.includes(key) && typeof value === 'string' && value) {
      result[key] = encrypt(value);
    } else if (typeof value === 'object' && value !== null) {
      result[key] = envelopeEncrypt(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

function envelopeDecrypt(config: any): any {
  if (!config || typeof config !== 'object') return config;
  const result: any = Array.isArray(config) ? [] : {};
  for (const [key, value] of Object.entries(config)) {
    if (SECRET_FIELDS.includes(key) && typeof value === 'string' && value) {
      try {
        result[key] = decrypt(value);
      } catch {
        result[key] = value;
      }
    } else if (typeof value === 'object' && value !== null) {
      result[key] = envelopeDecrypt(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

@Injectable()
export class IntegrationsService {
  constructor(
    private prisma: PrismaService,
    private hubspot: HubspotAdapter,
    private salesforce: SalesforceAdapter,
    private zoho: ZohoAdapter,
  ) {}

  findAll(query: any = {}) {
    const { page = 1, limit = 50 } = query;
    return Promise.all([
      this.prisma.integration.findMany({ skip: (+page - 1) * +limit, take: +limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.integration.count(),
    ]).then(([data, total]) => ({ data: data.map(r => ({ ...r, config: redactSecrets(r.config) })), meta: { total, page: +page, limit: +limit } }));
  }

  async findOne(id: string) { const i = await this.prisma.integration.findUnique({ where: { id } }); if (!i) throw new NotFoundException('Integration not found'); return { ...i, config: redactSecrets(i.config) }; }
  create(data: any) { return this.prisma.integration.create({ data: { ...data, config: envelopeEncrypt(data.config) } }).then(r => ({ ...r, config: redactSecrets(r.config) })); }
  async update(id: string, data: any) { await this.findOne(id); const payload = { ...data }; if (payload.config) payload.config = envelopeEncrypt(payload.config); return this.prisma.integration.update({ where: { id }, data: payload }).then(r => ({ ...r, config: redactSecrets(r.config) })); }
  async remove(id: string) { await this.findOne(id); return this.prisma.integration.delete({ where: { id } }); }

  async test(id: string) {
    const integration = await this.prisma.integration.findUnique({ where: { id } });
    if (!integration) throw new NotFoundException('Integration not found');

    let isHealthy = false;
    const config = envelopeDecrypt(integration.config as any);
    switch (integration.type) {
      case 'HUBSPOT': isHealthy = await this.hubspot.healthCheck(config); break;
      case 'SALESFORCE': isHealthy = await this.salesforce.healthCheck(config); break;
      case 'ZOHO': isHealthy = await this.zoho.healthCheck(config); break;
      default: return { name: integration.name, type: integration.type, status: 'unimplemented', testedAt: new Date(), message: 'Health check not implemented for this integration type' };
    }

    const newStatus = isHealthy ? 'connected' : 'disconnected';
    await this.prisma.integration.update({ where: { id }, data: { lastTested: new Date(), status: newStatus } });
    return { name: integration.name, type: integration.type, status: newStatus, testedAt: new Date() };
  }
}
