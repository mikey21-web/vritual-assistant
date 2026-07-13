import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsService } from '../events/events.service';

export interface AgentProfile {
  id: string;
  name: string;
  email: string;
  totalLeadsHandled: number;
  convertedLeads: number;
  conversionRate: number;
  avgResponseTimeMinutes: number | null;
  bySource: Record<string, { total: number; converted: number; rate: number }>;
  bySegment: Record<string, { total: number; converted: number; rate: number }>;
  strengths: string[];
  weaknesses: string[];
}

export interface RoutingRecommendation {
  agentId: string;
  agentName: string;
  score: number;
  reason: string;
}

@Injectable()
export class StaffAwarenessService {
  private readonly logger = new Logger(StaffAwarenessService.name);
  private cachedProfiles: AgentProfile[] = [];
  private lastScan = 0;

  constructor(
    private prisma: PrismaService,
    private events: EventsService,
  ) {}

  async scan(): Promise<AgentProfile[]> {
    const now = Date.now();
    if (now - this.lastScan < 10 * 60 * 1000 && this.cachedProfiles.length > 0) {
      return this.cachedProfiles;
    }

    const agents = await this.prisma.user.findMany({
      where: { active: true, role: { in: ['SALES_AGENT', 'SUPPORT_AGENT', 'MANAGER'] } as any },
      select: { id: true, name: true, email: true },
    });

    const ninetyDays = new Date(now - 90 * 24 * 60 * 60 * 1000);
    const profiles: AgentProfile[] = [];

    for (const agent of agents) {
      const leads = await this.prisma.lead.findMany({
        where: {
          assignedAgentId: agent.id,
          createdAt: { gte: ninetyDays },
        },
        select: { status: true, source: true, segment: true, createdAt: true, id: true },
      });

      if (leads.length < 3) continue;

      const convertedLeads = leads.filter(l => l.status === 'CONVERTED');
      const conversionRate = convertedLeads.length / leads.length;

      const responseTimes: number[] = [];
      for (const lead of leads.slice(0, 50)) {
        const firstNote = await this.prisma.internalNote.findFirst({
          where: { leadId: lead.id },
          orderBy: { createdAt: 'asc' },
          select: { createdAt: true },
        });
        if (firstNote) {
          const diffMs = firstNote.createdAt.getTime() - lead.createdAt.getTime();
          if (diffMs > 0 && diffMs < 24 * 60 * 60 * 1000) {
            responseTimes.push(diffMs);
          }
        }
      }
      const avgResponseTimeMinutes = responseTimes.length > 0
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length / 60000
        : null;

      const bySource: Record<string, { total: number; converted: number; rate: number }> = {};
      const bySegment: Record<string, { total: number; converted: number; rate: number }> = {};

      for (const lead of leads) {
        const src = lead.source || 'UNKNOWN';
        if (!bySource[src]) bySource[src] = { total: 0, converted: 0, rate: 0 };
        bySource[src].total++;
        if (lead.status === 'CONVERTED') bySource[src].converted++;
        bySource[src].rate = bySource[src].converted / bySource[src].total;

        const seg = lead.segment || 'COLD';
        if (!bySegment[seg]) bySegment[seg] = { total: 0, converted: 0, rate: 0 };
        bySegment[seg].total++;
        if (lead.status === 'CONVERTED') bySegment[seg].converted++;
        bySegment[seg].rate = bySegment[seg].converted / bySegment[seg].total;
      }

      const strengths: string[] = [];
      const weaknesses: string[] = [];
      const overallRate = conversionRate;

      for (const [src, data] of Object.entries(bySource)) {
        if (data.total >= 3) {
          if (data.rate >= overallRate * 1.2) strengths.push(`${src} (${(data.rate * 100).toFixed(0)}%)`);
          else if (data.rate <= overallRate * 0.7) weaknesses.push(`${src} (${(data.rate * 100).toFixed(0)}%)`);
        }
      }
      for (const [seg, data] of Object.entries(bySegment)) {
        if (data.total >= 3) {
          if (data.rate >= overallRate * 1.2) strengths.push(`segment:${seg} (${(data.rate * 100).toFixed(0)}%)`);
          else if (data.rate <= overallRate * 0.7) weaknesses.push(`segment:${seg} (${(data.rate * 100).toFixed(0)}%)`);
        }
      }

      profiles.push({
        id: agent.id,
        name: agent.name,
        email: agent.email,
        totalLeadsHandled: leads.length,
        convertedLeads: convertedLeads.length,
        conversionRate,
        avgResponseTimeMinutes,
        bySource,
        bySegment,
        strengths,
        weaknesses,
      });
    }

    this.cachedProfiles = profiles;
    this.lastScan = now;

    if (profiles.length > 0) {
      await this.events.emit({
        type: 'mikey.staff_scan',
        source: 'staff-awareness',
        payload: {
          agentCount: profiles.length,
          topPerformer: profiles.sort((a, b) => b.conversionRate - a.conversionRate)[0]?.name,
          summary: profiles.map(p => `${p.name}: ${(p.conversionRate * 100).toFixed(0)}% conversion (${p.totalLeadsHandled} leads, ${p.strengths.length} strengths)`).join(' | '),
        } as any,
      });
    }

    return profiles;
  }

  async getProfiles(): Promise<AgentProfile[]> {
    if (this.cachedProfiles.length === 0) {
      return this.scan();
    }
    return this.cachedProfiles;
  }

  async recommendRoute(leadId?: string): Promise<RoutingRecommendation[]> {
    await this.scan();
    if (this.cachedProfiles.length === 0) return [];

    let leadInfo: { source?: string; segment?: string } | null = null;
    if (leadId) {
      const lead = await this.prisma.lead.findUnique({
        where: { id: leadId },
        select: { source: true, segment: true },
      });
      if (lead) {
        leadInfo = { source: lead.source, segment: lead.segment };
      }
    }

    const scored = this.cachedProfiles.map(p => {
      let score = p.conversionRate * 100;
      if (p.avgResponseTimeMinutes) {
        score += Math.max(0, 30 - p.avgResponseTimeMinutes) * 0.5;
      }

      if (leadInfo) {
        if (leadInfo.source && p.bySource[leadInfo.source]) {
          score += p.bySource[leadInfo.source].rate * 50;
        }
        if (leadInfo.segment && p.bySegment[leadInfo.segment]) {
          score += p.bySegment[leadInfo.segment].rate * 30;
        }
      }

      const reasons: string[] = [];
      reasons.push(`${(p.conversionRate * 100).toFixed(0)}% overall conversion`);
      if (p.avgResponseTimeMinutes) {
        reasons.push(`avg response ${p.avgResponseTimeMinutes.toFixed(0)}min`);
      }
      if (leadInfo?.source && p.bySource[leadInfo.source]) {
        reasons.push(`${(p.bySource[leadInfo.source].rate * 100).toFixed(0)}% on ${leadInfo.source} leads`);
      }

      return {
        agentId: p.id,
        agentName: p.name,
        score: Math.round(score * 10) / 10,
        reason: reasons.join(', '),
      };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 3);
  }
}

