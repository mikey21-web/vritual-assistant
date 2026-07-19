import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TimelineService } from '../timeline/timeline.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class ReferralsService {
  constructor(
    private prisma: PrismaService,
    private timeline: TimelineService,
    private auditLogs: AuditLogsService,
  ) {}

  async createProgram(tenantId: string, data: {
    name: string; rewardType: string;
    rewardAmountPaise?: string; rewardPercent?: number;
  }) {
    const program = await this.prisma.referralProgram.create({
      data: {
        tenantId, name: data.name,
        rewardType: data.rewardType as any,
        rewardAmountPaise: data.rewardAmountPaise ? BigInt(data.rewardAmountPaise) : null,
        rewardPercent: data.rewardPercent,
      },
    });
    await this.auditLogs.log('CREATE', 'ReferralProgram', program.id, undefined, { after: program });
    return program;
  }

  async listPrograms(tenantId: string, activeOnly?: boolean) {
    const where: any = { tenantId };
    if (activeOnly) where.active = true;
    return this.prisma.referralProgram.findMany({
      where, orderBy: { createdAt: 'desc' },
      include: { _count: { select: { referrals: true } } },
    });
  }

  async findProgram(tenantId: string, id: string) {
    const p = await this.prisma.referralProgram.findFirst({
      where: { id, tenantId },
      include: {
        referrals: {
          include: {
            referrerContact: { select: { name: true, phone: true, email: true } },
            referredLead: { include: { contact: { select: { name: true, phone: true } } } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!p) throw new NotFoundException('Referral program not found');
    return p;
  }

  async createReferral(tenantId: string, data: {
    programId: string; referrerContactId: string; referredPhone: string;
    referredLeadId?: string;
  }) {
    const program = await this.prisma.referralProgram.findFirst({ where: { id: data.programId, tenantId } });
    if (!program) throw new NotFoundException('Referral program not found');
    if (!program.active) throw new BadRequestException('Program is not active');

    const contact = await this.prisma.contact.findFirst({ where: { id: data.referrerContactId, tenantId } });
    if (!contact) throw new NotFoundException('Referrer contact not found');

    // Check for duplicate
    const existing = await this.prisma.referral.findFirst({
      where: { programId: data.programId, referrerContactId: data.referrerContactId, referredPhone: data.referredPhone },
    });
    if (existing) throw new BadRequestException('This referral already exists');

    const referral = await this.prisma.referral.create({
      data: {
        tenantId, programId: data.programId, referrerContactId: data.referrerContactId,
        referredPhone: data.referredPhone, referredLeadId: data.referredLeadId,
      },
    });

    if (data.referredLeadId) {
      await this.timeline.add({
        type: 'referral_created', title: `Referred by ${contact.name}`,
        leadId: data.referredLeadId, metadata: { referralId: referral.id, programId: data.programId },
        createdById: undefined,
      });
    }
    return referral;
  }

  async updateReferralStatus(tenantId: string, referralId: string, status: string) {
    const referral = await this.prisma.referral.findFirst({ where: { id: referralId, program: { tenantId } } });
    if (!referral) throw new NotFoundException('Referral not found');

    const updated = await this.prisma.referral.update({
      where: { id: referralId }, data: { status: status as any },
    });
    await this.auditLogs.log('UPDATE', 'Referral', referralId, undefined, { before: referral, after: updated });
    return updated;
  }

  async getAnalytics(tenantId: string, programId?: string) {
    const where: any = { program: { tenantId } };
    if (programId) where.programId = programId;

    const [total, byStatus, recent] = await Promise.all([
      this.prisma.referral.count({ where }),
      this.prisma.referral.groupBy({ by: ['status'], where, _count: true }),
      this.prisma.referral.findMany({
        where, orderBy: { createdAt: 'desc' }, take: 20,
        include: { program: { select: { name: true } }, referrerContact: { select: { name: true, phone: true } }, referredLead: { include: { contact: { select: { name: true } } } } },
      }),
    ]);

    const booked = byStatus.find(s => s.status === 'BOOKED');
    return {
      total, byStatus,
      bookingRate: total > 0 ? Math.round(((booked?._count || 0) / total) * 100) : 0,
      recent,
    };
  }

  async getLeaderboard(tenantId: string, programId?: string) {
    const where: any = { status: 'BOOKED', program: { tenantId } };
    if (programId) where.programId = programId;

    const booked = await this.prisma.referral.groupBy({
      by: ['referrerContactId'],
      where,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 20,
    });

    const contactIds = booked.map(r => r.referrerContactId);
    const contacts = await this.prisma.contact.findMany({
      where: { id: { in: contactIds } },
      select: { id: true, name: true, phone: true },
    });
    const contactMap = new Map(contacts.map(c => [c.id, c]));

    return booked.map(r => {
      const c = contactMap.get(r.referrerContactId);
      return { referrerName: c?.name || 'Unknown', referrerPhone: c?.phone || '', bookings: r._count.id };
    });
  }
}
