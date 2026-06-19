import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { MessagePolicyService } from './message-policy.service';

@Injectable()
export class ConversationsService {
  constructor(
    private prisma: PrismaService,
    private auditLogs: AuditLogsService,
    private policy: MessagePolicyService,
  ) {}

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
    // Run policy gate for outbound messages
    if (data.direction === 'OUTBOUND') {
      const result = await this.policy.evaluate(
        data.leadId,
        data.channel,
        data.text,
        { isProactive: true, templateId: data.messageTemplateId },
      );
      if (!result.allowed) {
        // Store as blocked with the reason
        const msg = await this.prisma.conversationMessage.create({
          data: {
            ...data,
            deliveryStatus: 'blocked',
            metadata: { policyReason: result.reason, policyAction: result.action },
          },
        });
        await this.auditLogs.log('message_blocked', 'ConversationMessage', msg.id, userId, { reason: result.reason });
        throw new ForbiddenException(`Message blocked by policy: ${result.reason}`);
      }
    }

    const msg = await this.prisma.conversationMessage.create({ data });
    await this.auditLogs.log('message_sent', 'ConversationMessage', msg.id, userId, { channel: data.channel, direction: data.direction });
    return msg;
  }
}
