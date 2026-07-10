import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BusinessSettingsService {
  constructor(private prisma: PrismaService) {}

  private async ensure() {
    let s = await this.prisma.businessSettings.findFirst({});
    if (!s) s = await this.prisma.businessSettings.create({ data: {} });
    return s;
  }

  async get() {
    return this.ensure();
  }

  async getBranding() {
    const s = await this.ensure();
    return {
      businessName: s.businessName,
      logoUrl: s.logoUrl,
      faviconUrl: s.faviconUrl,
      primaryColor: s.primaryColor,
      labels: s.labels,
    };
  }

  async update(data: Record<string, any>) {
    const settings = await this.prisma.businessSettings.findFirst({});
    if (!settings) throw new NotFoundException('Business settings not found');
    return this.prisma.businessSettings.update({ where: { id: settings.id }, data });
  }
}
