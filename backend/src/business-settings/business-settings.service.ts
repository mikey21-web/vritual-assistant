import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BusinessSettingsService {
  constructor(private prisma: PrismaService) {}

  async get() {
    let settings = await this.prisma.businessSettings.findFirst({});
    if (!settings) {
      settings = await this.prisma.businessSettings.create({ data: {} });
    }
    return settings;
  }

  async update(data: Record<string, any>) {
    const settings = await this.prisma.businessSettings.findFirst({});
    if (!settings) throw new NotFoundException('Business settings not found. Call GET first to create defaults.');
    if (!settings) throw new NotFoundException('Business settings not found. Call GET first to create defaults.');
    return this.prisma.businessSettings.update({ where: { id: settings.id }, data });
  }
}
