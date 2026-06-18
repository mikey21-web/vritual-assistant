import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class ConversationsService {
  constructor(private prisma: PrismaService, private auditLogs: AuditLogsService) {}

  findAll(query: any = {}) {
    const { leadId, campaignId, channel, page = 1, limit = 50 } = query;
    const where: any = {};
    if (leadId) where.leadId = leadId;
    if (campaignId) where.campaignId = campaignId;
    if (channel) where.channel = channel;
    return Promise.all([
      this.prisma.conversationMessage.findMany({ where, skip: (+page - 1) * +limit, take: +limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.conversationMessage.count({ where }),
    ]).then(([data, total]) => ({ data, meta: { total, page: +page, limit: +limit } }));
  }

  getByLead(leadId: string) {
    return this.prisma.conversationMessage.findMany({ where: { leadId }, orderBy: { createdAt: 'asc' } });
  }

  async create(data: any, userId?: string) {
    const msg = await this.prisma.conversationMessage.create({ data });
    await this.auditLogs.log('message_sent', 'ConversationMessage', msg.id, userId, { channel: data.channel, direction: data.direction });
    return msg;
  }
}
