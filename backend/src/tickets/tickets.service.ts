import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateTicketDto, UpdateTicketDto, CreateCommentDto, KnowledgeArticleDto, UpdateKnowledgeArticleDto } from './dto/ticket.dto';

@Injectable()
export class TicketsService {
  constructor(
    private prisma: PrismaService,
    private auditLogs: AuditLogsService,
    private realtime: RealtimeGateway,
    private notifications: NotificationsService,
  ) {}

  async findAll(query: any = {}) {
    const { page = 1, limit = 20, status, priority, assignedAgentId, leadId } = query;
    const where: any = {};
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (assignedAgentId) where.assignedAgentId = assignedAgentId;
    if (leadId) where.leadId = leadId;
    const [data, total] = await Promise.all([
      this.prisma.ticket.findMany({
        where, skip: (+page - 1) * +limit, take: +limit, orderBy: { createdAt: 'desc' },
        include: { lead: { include: { contact: { select: { name: true } } } }, assignedAgent: { select: { id: true, name: true } }, comments: { take: 1, orderBy: { createdAt: 'desc' } } },
      }),
      this.prisma.ticket.count({ where }),
    ]);
    return { data, meta: { total, page: +page, limit: +limit } };
  }

  async findOne(id: string) {
    const t = await this.prisma.ticket.findUnique({
      where: { id },
      include: { lead: { include: { contact: true } }, contact: true, assignedAgent: { select: { id: true, name: true, email: true } }, comments: { include: { user: { select: { id: true, name: true } } }, orderBy: { createdAt: 'asc' } } },
    });
    if (!t) throw new NotFoundException('Ticket not found');
    return t;
  }

  async create(dto: CreateTicketDto, userId?: string) {
    let slaRuleId: string | undefined;
    let dueAt: Date | undefined;

    // Auto-assign SLA rule based on priority
    const activeRules = await this.prisma.slaRule.findMany({
      where: { active: true },
      orderBy: { responseTimeMinutes: 'asc' },
    });
    const slaRule = this.pickSlaRule(activeRules, dto.priority);
    if (slaRule) {
      slaRuleId = slaRule.id;
      dueAt = new Date(Date.now() + slaRule.responseTimeMinutes * 60000);
    }

    const data: any = { ...dto, tenantId: 'default-tenant', slaRuleId, dueAt };
    const ticket = await this.prisma.ticket.create({ data });
    await this.auditLogs.log('ticket_created', 'Ticket', ticket.id, userId, { subject: dto.subject });
    this.realtime.emit('ticket:new', ticket);
    return ticket;
  }

  // SlaRule.condition is a free-form JSON blob (same convention as
  // AdvancedFeaturesService's lead SLA rules: { priority, status, segment, source }).
  // Prefer a rule whose condition.priority matches this ticket's priority, then a rule
  // with no priority condition (applies to any priority), then the fastest active rule
  // as a last resort so tickets still get an SLA even with no rules configured for their priority.
  private pickSlaRule<T extends { condition: unknown }>(rules: T[], priority?: string) {
    const conditionOf = (rule: T): Record<string, unknown> => {
      try {
        return typeof rule.condition === 'string' ? JSON.parse(rule.condition) : ((rule.condition as Record<string, unknown>) || {});
      } catch {
        return {};
      }
    };
    if (priority) {
      const matched = rules.find((r) => conditionOf(r).priority === priority);
      if (matched) return matched;
    }
    return rules.find((r) => !conditionOf(r).priority) || rules[0];
  }

  async update(id: string, dto: UpdateTicketDto, userId?: string) {
    const existing = await this.findOne(id);
    const data: any = { ...dto };
    if (dto.status === 'RESOLVED') data.resolvedAt = new Date();
    // Reopening a previously resolved/closed ticket makes it eligible for a fresh SLA breach
    // notification later, instead of staying silently suppressed forever.
    if (dto.status && !['RESOLVED', 'CLOSED'].includes(dto.status) && ['RESOLVED', 'CLOSED'].includes(existing.status)) {
      data.slaBreachNotifiedAt = null;
    }

    const ticket = await this.prisma.ticket.update({ where: { id }, data });
    await this.auditLogs.log('ticket_updated', 'Ticket', id, userId, dto);
    this.realtime.emit('ticket:updated', ticket);
    return ticket;
  }

  async addComment(ticketId: string, dto: CreateCommentDto, userId?: string) {
    await this.findOne(ticketId);
    const comment = await this.prisma.ticketComment.create({
      data: { ticketId, userId, content: dto.content, isInternal: dto.isInternal ?? true },
      include: { user: { select: { id: true, name: true } } },
    });
    await this.auditLogs.log('ticket_comment_added', 'TicketComment', comment.id, userId, { ticketId });
    return comment;
  }

  async findKnowledgeArticles(query: any = {}) {
    const { published, search, tag, page = 1, limit = 50 } = query;
    const where: any = {};
    if (published !== undefined) where.published = published === 'true';
    if (search) where.OR = [{ title: { contains: search, mode: 'insensitive' as const } }, { body: { contains: search, mode: 'insensitive' as const } }];
    if (tag) where.tags = { has: tag };
    const [data, total] = await Promise.all([
      this.prisma.knowledgeArticle.findMany({ where, skip: (+page - 1) * +limit, take: +limit, orderBy: { createdAt: 'desc' }, include: { author: { select: { id: true, name: true } } } }),
      this.prisma.knowledgeArticle.count({ where }),
    ]);
    return { data, meta: { total, page: +page, limit: +limit } };
  }

  async createKnowledgeArticle(dto: KnowledgeArticleDto, userId: string) {
    const article = await this.prisma.knowledgeArticle.create({
      data: { ...dto, tenantId: 'default-tenant', authorId: userId },
    });
    await this.auditLogs.log('knowledge_article_created', 'KnowledgeArticle', article.id, userId, { title: dto.title });
    return article;
  }

  async updateKnowledgeArticle(id: string, dto: UpdateKnowledgeArticleDto) {
    const existing = await this.prisma.knowledgeArticle.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Article not found');
    return this.prisma.knowledgeArticle.update({ where: { id }, data: dto });
  }

  async deleteKnowledgeArticle(id: string) {
    await this.prisma.knowledgeArticle.delete({ where: { id } });
    return { deleted: true };
  }

  // SLA breach check
  // Only notifies each ticket once (slaBreachNotifiedAt), otherwise every repeated call to
  // this endpoint (e.g. an external cron hitting it every few minutes) would re-send a
  // notification and SMS for every still-overdue, still-unresolved ticket every single time.
  async checkSlaBreaches() {
    const overdue = await this.prisma.ticket.findMany({
      where: { dueAt: { lte: new Date() }, status: { notIn: ['RESOLVED', 'CLOSED'] }, slaBreachNotifiedAt: null },
      include: { assignedAgent: { include: { notificationPrefs: { take: 1 } } } },
    });
    for (const ticket of overdue) {
      await this.auditLogs.log('sla_breach', 'Ticket', ticket.id, ticket.assignedAgentId ?? undefined, { subject: ticket.subject });
      if (ticket.assignedAgent?.notificationPrefs?.[0]?.slaBreach) {
        this.realtime.emit('sla:breach', { ticketId: ticket.id, subject: ticket.subject });
      }
      if (ticket.assignedAgentId) {
        await this.notifications.create({
          tenantId: ticket.tenantId,
          userId: ticket.assignedAgentId,
          type: 'sla_breach',
          title: `SLA breached: ${ticket.subject}`,
          link: '/tickets',
        });
      }
      await this.prisma.ticket.update({ where: { id: ticket.id }, data: { slaBreachNotifiedAt: new Date() } });
    }
    return { breached: overdue.length };
  }
}
