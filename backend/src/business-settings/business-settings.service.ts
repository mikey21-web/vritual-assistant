import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BusinessSettingsService {
  constructor(private prisma: PrismaService) {}

  private async ensure() {
    // Atomic upsert on the unique `singleton` column, instead of a find-then-create check
    // that two concurrent callers could both pass and each create their own row.
    return this.prisma.businessSettings.upsert({
      where: { singleton: true },
      update: {},
      create: { singleton: true },
    });
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
    const settings = await this.ensure();
    return this.prisma.businessSettings.update({ where: { id: settings.id }, data });
  }
}
