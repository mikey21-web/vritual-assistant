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
    const slaRule = await this.prisma.slaRule.findFirst({
      where: { active: true },
      orderBy: { responseTimeMinutes: 'asc' },
    });
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

  async update(id: string, dto: UpdateTicketDto, userId?: string) {
    const existing = await this.findOne(id);
    const data: any = { ...dto };
    if (dto.status === 'RESOLVED') data.resolvedAt = new Date();

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
  async checkSlaBreaches() {
    const overdue = await this.prisma.ticket.findMany({
      where: { dueAt: { lte: new Date() }, status: { notIn: ['RESOLVED', 'CLOSED'] } },
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
    }
    return { breached: overdue.length };
  }
}
