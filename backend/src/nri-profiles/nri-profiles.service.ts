import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TimelineService } from '../timeline/timeline.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class NriProfilesService {
  constructor(
    private prisma: PrismaService,
    private timeline: TimelineService,
    private auditLogs: AuditLogsService,
  ) {}

  async createProfile(tenantId: string, data: {
    leadId: string; countryOfResidence: string; timezone: string;
    preferredContactHoursLocal?: string; passportNumberMasked?: string;
    overseasAddress?: any; remotePaymentMethodNote?: string;
  }) {
    const lead = await this.prisma.lead.findFirst({ where: { id: data.leadId, tenantId } });
    if (!lead) throw new NotFoundException('Lead not found');

    const existing = await this.prisma.nriBuyerProfile.findUnique({ where: { leadId: data.leadId } });
    if (existing) throw new BadRequestException('NRI profile already exists for this lead');

    const profile = await this.prisma.nriBuyerProfile.create({
      data: {
        leadId: data.leadId, tenantId,
        countryOfResidence: data.countryOfResidence, timezone: data.timezone,
        preferredContactHoursLocal: data.preferredContactHoursLocal,
        passportNumberMasked: data.passportNumberMasked,
        overseasAddress: data.overseasAddress, remotePaymentMethodNote: data.remotePaymentMethodNote,
      },
      include: { lead: { include: { contact: { select: { name: true, phone: true, email: true } } } } },
    });

    await this.timeline.add({
      type: 'nri_profile_created', title: `NRI profile created (${data.countryOfResidence})`,
      leadId: data.leadId, metadata: { nriProfileId: profile.id }, createdById: undefined,
    });
    return profile;
  }

  async updateProfile(tenantId: string, id: string, data: any) {
    const profile = await this.prisma.nriBuyerProfile.findFirst({ where: { id, lead: { tenantId } } });
    if (!profile) throw new NotFoundException('NRI profile not found');

    const updated = await this.prisma.nriBuyerProfile.update({
      where: { id }, data,
      include: { lead: { include: { contact: { select: { name: true, phone: true, email: true } } } } },
    });
    await this.auditLogs.log('UPDATE', 'NriBuyerProfile', id, undefined, { before: profile, after: updated });
    return updated;
  }

  async findAll(tenantId: string, filters?: { country?: string }) {
    const where: any = { lead: { tenantId } };
    if (filters?.country) where.countryOfResidence = { contains: filters.country, mode: 'insensitive' };

    return this.prisma.nriBuyerProfile.findMany({
      where, orderBy: { createdAt: 'desc' },
      include: { lead: { include: { contact: { select: { name: true, phone: true, email: true } } } } },
    });
  }

  async findOne(tenantId: string, id: string) {
    const profile = await this.prisma.nriBuyerProfile.findFirst({
      where: { id, lead: { tenantId } },
      include: { lead: { include: { contact: true, bookings: { include: { unit: { include: { project: { select: { name: true } } } } } } } } },
    });
    if (!profile) throw new NotFoundException('NRI profile not found');
    return profile;
  }

  async getStats(tenantId: string) {
    const [total, byCountry] = await Promise.all([
      this.prisma.nriBuyerProfile.count({ where: { lead: { tenantId } } }),
      this.prisma.nriBuyerProfile.groupBy({
        by: ['countryOfResidence'], where: { lead: { tenantId } },
        _count: true, orderBy: { _count: { countryOfResidence: 'desc' } },
      }),
    ]);

    return { total, byCountry: byCountry.map(c => ({ country: c.countryOfResidence, count: c._count })) };
  }
}
