import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AdvancedFeaturesService } from '../advanced-features/advanced-features.service';
import { EventsService } from '../events/events.service';
import { getNested, evaluateCondition } from '../shared/scoring.util';
import { TenantContextService } from '../shared/tenant-context.service';

@Injectable()
export class LeadsService {
  constructor(
    private prisma: PrismaService,
    private auditLogs: AuditLogsService,
    private advanced: AdvancedFeaturesService,
    private events: EventsService,
    private tenantCtx: TenantContextService,
  ) {}

  async findAll(query: any = {}) {
    const { page = 1, limit = 20, status, segment, source, campaignId, assignedAgentId, search, tenantId } = query;
    const where: any = {};
    if (tenantId) where.tenantId = tenantId;
    if (status) where.status = status;
    if (segment) where.segment = segment;
    if (source) where.source = source;
    if (campaignId) where.campaignId = campaignId;
    if (assignedAgentId) where.assignedAgentId = assignedAgentId;
    if (search) {
      where.OR = [
        { contact: { name: { contains: search, mode: 'insensitive' } } },
        { contact: { email: { contains: search, mode: 'insensitive' } } },
        { contact: { phone: { contains: search } } },
        { message: { contains: search, mode: 'insensitive' } },
      ];
    }
    const [data, total] = await Promise.all([
      this.prisma.lead.findMany({
        where, skip: (+page - 1) * +limit, take: +limit, orderBy: { createdAt: 'desc' },
        include: { contact: true, assignedAgent: { select: { id: true, name: true, email: true } }, campaign: { select: { id: true, name: true } } },
      }),
      this.prisma.lead.count({ where }),
    ]);
    return { data, meta: { total, page: +page, limit: +limit } };
  }

  async findOne(id: string) {
    const l = await this.prisma.lead.findUnique({
      where: { id },
      include: { contact: true, assignedAgent: { select: { id: true, name: true, email: true } }, campaign: { select: { id: true, name: true } }, conversations: true, conversions: true, tasks: true },
    });
    if (!l) throw new NotFoundException('Lead not found');
    return l;
  }

  async create(data: any, userId?: string) {
    const lead = await this.prisma.lead.create({ data });
    await this.auditLogs.log('lead_created', 'Lead', lead.id, userId);
    await this.events.emit({ type: 'lead.created', leadId: lead.id, entityType: 'lead', entityId: lead.id, payload: { source: lead.source, status: lead.status }, createdById: userId });
    return lead;
  }

  async update(id: string, data: any, userId?: string) {
    await this.findOne(id);
    const lead = await this.prisma.lead.update({ where: { id }, data });
    await this.auditLogs.log('lead_updated', 'Lead', id, userId, data);
    if (data.status) await this.events.emit({ type: 'lead.status_changed', leadId: id, entityType: 'lead', entityId: id, payload: { from: null, to: data.status }, createdById: userId });
    if (data.segment) await this.events.emit({ type: 'lead.segment_changed', leadId: id, entityType: 'lead', entityId: id, payload: { to: data.segment }, createdById: userId });
    return lead;
  }

  async score(id: string, userId?: string) {
    const lead = await this.prisma.lead.findUnique({ where: { id }, include: { contact: true } });
    if (!lead) throw new NotFoundException('Lead not found');

    const rules = await this.prisma.scoringRule.findMany({ where: { active: true, tenantId: lead.tenantId || undefined } });
    let totalScore = lead.score || 0;
    for (const rule of rules) {
      const fieldValue = getNested(lead, rule.field);
      if (evaluateCondition(fieldValue, rule.operator, rule.value)) totalScore += rule.points;
    }

    const oldScore = lead.score;
    totalScore = Math.max(-100, Math.min(100, totalScore));
    const segment = this.determineSegment(totalScore);

    if (totalScore !== oldScore) {
      await this.prisma.scoreLog.create({ data: { leadId: id, oldScore, newScore: totalScore, reason: 'Automatic scoring run' } });
      await this.auditLogs.log('score_changed', 'Lead', id, userId, { oldScore, newScore: totalScore });
    }
    await this.events.emit({ type: 'lead.scored', leadId: id, entityType: 'lead', entityId: id, payload: { oldScore, newScore: totalScore, segment }, createdById: userId });
    return this.prisma.lead.update({ where: { id }, data: { score: totalScore, segment } });
  }

  async assign(id: string, agentId?: string, userId?: string) {
    const lead = await this.findOne(id);
    if (!agentId) {
      const available = await this.prisma.user.findFirst({
        where: { role: { in: ['SALES_AGENT','MANAGER'] }, tenantId: lead.tenantId || undefined },
        orderBy: { createdAt: 'asc' },
        select: { id: true },
      });
      agentId = available?.id || undefined;
    }
    const updated = await this.prisma.lead.update({ where: { id }, data: { assignedAgentId: agentId } });
    await this.auditLogs.log('lead_assigned', 'Lead', id, userId, { agentId });
    await this.events.emit({ type: 'lead.assigned', leadId: id, entityType: 'lead', entityId: id, payload: { agentId }, createdById: userId });
    return updated;
  }

  async markSpam(id: string, userId?: string) {
    await this.findOne(id);
    const lead = await this.prisma.lead.update({ where: { id }, data: { status: 'SPAM', segment: 'UNQUALIFIED', score: -100 } });
    await this.auditLogs.log('lead_marked_spam', 'Lead', id, userId);
    return lead;
  }

  private determineSegment(score: number) {
    if (score >= 70) return 'HOT';
    if (score >= 40) return 'WARM';
    if (score >= 1) return 'COLD';
    return 'UNQUALIFIED';
  }
}
