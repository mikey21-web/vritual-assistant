import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { getTenantContext } from '../shared/tenant-context.service';

@Injectable()
export class BusinessSettingsService {
  constructor(private prisma: PrismaService) {}

  async get() {
    const ctx = getTenantContext();
    const tenantId = ctx.tenantId;
    const where = tenantId ? { tenantId } : {};
    let settings = await this.prisma.businessSettings.findFirst({ where });
    if (!settings && tenantId) {
      settings = await this.prisma.businessSettings.create({ data: { tenantId } });
    } else if (!settings) {
      settings = await this.prisma.businessSettings.create({ data: {} });
    }
    return settings;
  }

  async update(data: Record<string, any>) {
    const ctx = getTenantContext();
    const tenantId = ctx.tenantId;
    const where = tenantId ? { tenantId } : {};
    const settings = await this.prisma.businessSettings.findFirst({ where });
    if (!settings) throw new NotFoundException('Business settings not found. Call GET first to create defaults.');
    return this.prisma.businessSettings.update({ where: { id: settings.id }, data });
  }
}
