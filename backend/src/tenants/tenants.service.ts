import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TenantsService {
  private readonly logger = new Logger(TenantsService.name);

  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.tenant.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findOne(id: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return tenant;
  }

  async findBySlug(slug: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { slug } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return tenant;
  }

  async create(data: { name: string; slug: string; domain?: string; plan?: string }) {
    const existing = await this.prisma.tenant.findUnique({ where: { slug: data.slug } });
    if (existing) throw new NotFoundException('Tenant slug already exists');
    return this.prisma.tenant.create({ data: { ...data, plan: data.plan || 'starter' } });
  }

  async update(id: string, data: Partial<{ name: string; domain: string; plan: string; active: boolean }>) {
    await this.findOne(id);
    return this.prisma.tenant.update({ where: { id }, data });
  }

  async getStats(id: string) {
    const [users, contacts, leads, campaigns, integrations] = await Promise.all([
      this.prisma.user.count({ where: { tenantId: id } }),
      this.prisma.contact.count({ where: { tenantId: id } }),
      this.prisma.lead.count({ where: { tenantId: id } }),
      this.prisma.campaign.count({ where: { tenantId: id } }),
      this.prisma.integration.count({ where: { tenantId: id } }),
    ]);
    return { tenantId: id, users, contacts, leads, campaigns, integrations };
  }
}
