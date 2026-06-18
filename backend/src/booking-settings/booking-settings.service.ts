import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CalendlyAdapter, GoogleCalendarAdapter } from '../shared/adapters/calendar.adapter';

@Injectable()
export class BookingSettingsService {
  constructor(
    private prisma: PrismaService,
    private calendly: CalendlyAdapter,
    private googleCal: GoogleCalendarAdapter,
  ) {}

  findAll(query: any = {}) {
    const { page = 1, limit = 50 } = query;
    return Promise.all([this.prisma.bookingSetting.findMany({ skip: (+page - 1) * +limit, take: +limit, orderBy: { createdAt: 'desc' } }), this.prisma.bookingSetting.count()]).then(([data, total]) => ({ data, meta: { total, page: +page, limit: +limit } }));
  }
  create(data: any) { return this.prisma.bookingSetting.create({ data }); }
  async update(id: string, data: any) { const b = await this.prisma.bookingSetting.findUnique({ where: { id } }); if (!b) throw new NotFoundException('Booking setting not found'); return this.prisma.bookingSetting.update({ where: { id }, data }); }

  async test(id: string) {
    const b = await this.prisma.bookingSetting.findUnique({ where: { id } });
    if (!b) throw new NotFoundException('Booking setting not found');

    const adapter = b.provider === 'google' ? this.googleCal : b.provider === 'custom' ? null : this.calendly;
    if (!adapter) {
      return { setting: { id: b.id, name: b.name, provider: b.provider }, healthy: false, test: 'skipped', message: 'Custom provider — manual config required' };
    }
    const healthy = await adapter.healthCheck(b.config as any);

    return {
      setting: { id: b.id, name: b.name, provider: b.provider },
      healthy,
      test: healthy ? 'success' : 'failed',
      message: healthy ? 'Provider connection verified' : 'Provider unreachable — check credentials',
    };
  }
}
