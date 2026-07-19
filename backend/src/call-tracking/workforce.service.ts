import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** Shift rosters, agent availability, call QA, and site-visit attendance (spec 64.2). */
@Injectable()
export class WorkforceService {
  constructor(private prisma: PrismaService) {}

  createShift(tenantId: string, data: { name: string; startTime: string; endTime: string; daysOfWeek?: number[] }) {
    return this.prisma.shift.create({ data: { tenantId, ...data } });
  }

  listShifts(tenantId: string) {
    return this.prisma.shift.findMany({ where: { tenantId, active: true } });
  }

  async setAvailability(tenantId: string, userId: string, status: string, shiftId?: string) {
    return this.prisma.agentAvailability.upsert({
      where: { userId },
      create: { tenantId, userId, status: status as any, shiftId, since: new Date() },
      update: { status: status as any, shiftId, since: new Date() },
    });
  }

  listAvailability(tenantId: string) {
    return this.prisma.agentAvailability.findMany({
      where: { tenantId },
      include: { user: { select: { id: true, name: true, role: true } }, shift: { select: { id: true, name: true } } },
    });
  }

  async submitQualityReview(tenantId: string, data: {
    callLogId: string; reviewerId?: string; score: number; notes?: string; criteria?: Record<string, unknown>;
  }) {
    const call = await this.prisma.callLog.findFirst({ where: { id: data.callLogId, tenantId } });
    if (!call) throw new NotFoundException('Call log not found');
    return this.prisma.callQualityReview.create({
      data: {
        tenantId,
        callLogId: data.callLogId,
        reviewerId: data.reviewerId,
        score: data.score,
        notes: data.notes,
        criteria: (data.criteria || {}) as any,
      },
    });
  }

  async recordVisitAttendance(tenantId: string, siteVisitId: string, data: {
    checkedInById?: string; method?: string; lat?: number; lng?: number;
  }) {
    const visit = await this.prisma.siteVisit.findFirst({ where: { id: siteVisitId, tenantId } });
    if (!visit) throw new NotFoundException('Site visit not found');
    return this.prisma.visitAttendance.create({
      data: { tenantId, siteVisitId, checkedInById: data.checkedInById, method: data.method || 'MANUAL', lat: data.lat, lng: data.lng },
    });
  }

  /**
   * Manager snapshot (spec 64.2): current agent queue load, unanswered leads,
   * average QA score (last 30 days), and live availability breakdown.
   */
  async managerDashboard(tenantId: string) {
    const [availability, openLeadsByAgent, unansweredCalls, qaAgg] = await Promise.all([
      this.prisma.agentAvailability.findMany({
        where: { tenantId },
        include: { user: { select: { id: true, name: true } } },
      }),
      this.prisma.lead.groupBy({
        by: ['assignedAgentId'],
        where: { tenantId, assignedAgentId: { not: null }, status: { notIn: ['CONVERTED', 'LOST'] } },
        _count: { _all: true },
      }),
      this.prisma.callLog.count({
        where: { tenantId, direction: 'INBOUND', status: { in: ['MISSED', 'NO_ANSWER'] } },
      }),
      this.prisma.callQualityReview.aggregate({
        where: { tenantId, createdAt: { gte: new Date(Date.now() - 30 * 86400000) } },
        _avg: { score: true },
        _count: { _all: true },
      }),
    ]);

    return {
      availabilityByStatus: availability.reduce((acc: Record<string, number>, a) => {
        acc[a.status] = (acc[a.status] || 0) + 1;
        return acc;
      }, {}),
      agents: availability.map(a => ({ userId: a.userId, name: a.user.name, status: a.status, since: a.since })),
      queueLoadByAgent: openLeadsByAgent.map(g => ({ agentId: g.assignedAgentId, openLeads: g._count._all })),
      unansweredCalls,
      avgQualityScoreLast30d: qaAgg._avg.score,
      qualityReviewsLast30d: qaAgg._count._all,
    };
  }
}
