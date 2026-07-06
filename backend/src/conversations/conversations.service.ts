import { Injectable, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { MessagePolicyService } from './message-policy.service';
import { TwilioSmsAdapter } from '../shared/adapters/sms.adapter';
import { WhatsAppCloudAdapter, TelegramBotAdapter } from '../shared/adapters/messaging.adapter';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ConversationsService {
  private readonly logger = new Logger(ConversationsService.name);

  constructor(
    private prisma: PrismaService,
    private auditLogs: AuditLogsService,
    private policy: MessagePolicyService,
    private smsAdapter: TwilioSmsAdapter,
    private whatsAppAdapter: WhatsAppCloudAdapter,
    private telegramAdapter: TelegramBotAdapter,
    private config: ConfigService,
  ) {}

  findAll(query: any = {}) {
    const { leadId, campaignId, channel, page = 1, limit = 50 } = query;
    const where: any = {};
    if (leadId) where.leadId = leadId;
    if (campaignId) where.campaignId = campaignId;
    if (channel) where.channel = channel;
    return Promise.all([
      this.prisma.conversationMessage.findMany({
        where, skip: (+page - 1) * +limit, take: +limit, orderBy: { createdAt: 'desc' },
        include: { lead: { include: { contact: true } } },
      }),
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

    // Dispatch via channel adapter for outbound messages
    if (data.direction === 'OUTBOUND' && data.channel) {
      this.dispatchViaChannel(msg).catch(err => this.logger.error(`Channel dispatch failed: ${err.message}`));
    }

    await this.auditLogs.log('message_sent', 'ConversationMessage', msg.id, userId, { channel: data.channel, direction: data.direction });
    return msg;
  }

  private async dispatchViaChannel(msg: any): Promise<void> {
    const lead = await this.prisma.lead.findUnique({
      where: { id: msg.leadId },
      include: { contact: true },
    });
    if (!lead?.contact) {
      this.logger.warn(`Cannot dispatch message ${msg.id}: lead or contact not found`);
      return;
    }

    const channel = (msg.channel || '').toUpperCase();
    const text = msg.text;

    if (channel === 'SMS') {
      if (!lead.contact.phone) {
        this.logger.warn(`Cannot dispatch SMS for message ${msg.id}: contact has no phone`);
        return;
      }
      const result = await this.smsAdapter.send(lead.contact.phone, text);
      if (result.success) {
        await this.prisma.conversationMessage.update({
          where: { id: msg.id },
          data: { deliveryStatus: 'delivered', providerMessageId: result.providerMessageId },
        });
      } else {
        await this.prisma.conversationMessage.update({
          where: { id: msg.id },
          data: { deliveryStatus: 'failed', metadata: { error: result.error } },
        });
      }
    } else if (channel === 'WHATSAPP') {
      if (!lead.contact.whatsapp && !lead.contact.phone) {
        this.logger.warn(`Cannot dispatch WhatsApp for message ${msg.id}: contact has no phone/whatsapp`);
        return;
      }
      const to: string = lead.contact.whatsapp || lead.contact.phone || '';
      if (!to) return;
      const config = {
        phoneNumberId: this.config.get<string>('WHATSAPP_PHONE_NUMBER_ID') || '',
        accessToken: this.config.get<string>('WHATSAPP_ACCESS_TOKEN') || '',
      };
      const result = await this.whatsAppAdapter.sendMessage(to, text, config);
      if (result.success) {
        await this.prisma.conversationMessage.update({
          where: { id: msg.id },
          data: { deliveryStatus: 'delivered', providerMessageId: result.messageId },
        });
      } else {
        await this.prisma.conversationMessage.update({
          where: { id: msg.id },
          data: { deliveryStatus: 'failed', metadata: { error: result.error } },
        });
      }
    } else if (channel === 'TELEGRAM') {
      if (!lead.contact.whatsapp && !lead.contact.phone) {
        this.logger.warn(`Cannot dispatch Telegram for message ${msg.id}: contact has no identifier`);
        return;
      }
      const chatId: string = lead.contact.whatsapp || lead.contact.phone || '';
      if (!chatId) return;
      const result = await this.telegramAdapter.sendMessage(chatId, text, {
        botToken: this.config.get<string>('TELEGRAM_BOT_TOKEN'),
      });
      if (result.success) {
        await this.prisma.conversationMessage.update({
          where: { id: msg.id },
          data: { deliveryStatus: 'delivered', providerMessageId: result.messageId },
        });
      } else {
        await this.prisma.conversationMessage.update({
          where: { id: msg.id },
          data: { deliveryStatus: 'failed', metadata: { error: result.error } },
        });
      }
    }
    // Other channels (EMAIL, etc.) would be handled here
  }
}
