import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ContactsService } from '../contacts/contacts.service';
import { LeadsService } from '../leads/leads.service';
import { ConversationsService } from '../conversations/conversations.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AgentClientService } from '../agent/agent-client.service';
import * as crypto from 'crypto';

@Injectable()
export class WebhooksService {
  constructor(
    private prisma: PrismaService,
    private contactsService: ContactsService,
    private leadsService: LeadsService,
    private conversationsService: ConversationsService,
    private auditLogs: AuditLogsService,
    private agentClient: AgentClientService,
  ) {}

  private idempotencyKey(parts: string[]): string { return parts.join(':').slice(0, 255); }
  private payloadHash(payload: any): string { return crypto.createHash('md5').update(JSON.stringify(payload, Object.keys(payload).sort())).digest('hex'); }

  async handleFormSubmit(provider: string, payload: any, req?: any) {
    const key = this.idempotencyKey([provider, 'form', payload.submissionId || this.payloadHash(payload)]);
    const existing = await this.prisma.webhookEvent.findUnique({ where: { idempotencyKey: key } });
    if (existing) return { status: 'duplicate', result: existing.processedResult };

    const contact = await this.contactsService.findOrCreate({ name: payload.name, email: payload.email, phone: payload.phone, whatsapp: payload.whatsapp, company: payload.company }, req);
    const lead = await this.leadsService.create({ contactId: contact.id, source: 'FORM', message: payload.message, interest: payload.interest, metadata: payload });
    const result = { contact, lead };
    await this.prisma.webhookEvent.create({ data: { provider, eventType: 'form_submit', idempotencyKey: key, rawPayload: payload, processedResult: result } });
    await this.auditLogs.log('webhook_processed', 'WebhookEvent', key, undefined, { provider, eventType: 'form_submit' });
    return { data: result };
  }

  async handleWhatsApp(provider: string, payload: any, req?: any) {
    const msgId = payload.messageId || payload.id;
    const key = this.idempotencyKey([provider, 'whatsapp', msgId || this.payloadHash(payload)]);
    const existing = await this.prisma.webhookEvent.findUnique({ where: { idempotencyKey: key } });
    if (existing) return { status: 'duplicate', result: existing.processedResult };

    const text = payload.text || payload.body || '';
    const contact = await this.contactsService.findOrCreate({ name: payload.contactName, phone: payload.from, whatsapp: payload.from }, req);

    // Dedup: reuse existing active lead for this contact instead of creating new one per message
    const existingLead = await this.prisma.lead.findFirst({
      where: {
        contactId: contact.id,
        status: { notIn: ['LOST', 'CONVERTED', 'SPAM'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    let lead;
    if (existingLead) {
      lead = existingLead;
    } else {
      lead = await this.leadsService.create({ contactId: contact.id, source: 'WHATSAPP', message: text, metadata: payload });
    }

    // Handle STOP commands for consent/opt-out
    const stopPattern = /^\s*(stop|unsubscribe|cancel|opt.?out)\s*$/i;
    if (stopPattern.test(text.trim())) {
      await this.prisma.contact.update({
        where: { id: contact.id },
        data: {
          consentStatus: 'opted_out',
          optedOutAt: new Date(),
        },
      });
      await this.prisma.consentEvent.create({
        data: {
          contactId: contact.id,
          channel: 'WHATSAPP',
          action: 'opt_out',
          source: 'webhook',
        },
      });
      // Send a single confirmation
      await this.conversationsService.create({
        text: "You've been unsubscribed. You won't receive further messages from us.",
        channel: 'WHATSAPP',
        direction: 'OUTBOUND',
        leadId: lead.id,
        contactId: contact.id,
      });
    }

    await this.conversationsService.create({ text, channel: 'WHATSAPP', direction: 'INBOUND', providerMessageId: msgId, leadId: lead.id, contactId: contact.id, metadata: payload });
    const result = { contact, lead };
    await this.prisma.webhookEvent.create({ data: { provider, eventType: 'whatsapp_message', idempotencyKey: key, rawPayload: payload, processedResult: result } });

    this.agentClient.trigger(lead.id, msgId || key, 'WHATSAPP', text, lead.tenantId || contact.tenantId);

    return { data: result };
  }

  async handleTelegram(payload: any, req?: any) {
    const msg = payload?.message;
    if (!msg?.chat?.id) return { status: 'ignored', reason: 'no chat message' };

    const chatId = String(msg.chat.id);
    const text = msg.text || '';
    const msgId = String(msg.message_id);
    const key = this.idempotencyKey(['telegram', chatId, msgId]);

    const existing = await this.prisma.webhookEvent.findUnique({ where: { idempotencyKey: key } });
    if (existing) return { status: 'duplicate', result: existing.processedResult };

    const firstName = msg.from?.first_name || msg.chat?.first_name || 'Telegram User';
    const lastName = msg.from?.last_name || '';
    const userName = msg.from?.username || '';

    const contact = await this.contactsService.findOrCreate({
      name: `${firstName}${lastName ? ' ' + lastName : ''}`.trim() || 'Telegram User',
      phone: chatId,
      whatsapp: chatId,
    }, req);

    const existingLead = await this.prisma.lead.findFirst({
      where: {
        contactId: contact.id,
        status: { notIn: ['LOST', 'CONVERTED', 'SPAM'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    let lead;
    if (existingLead) {
      lead = existingLead;
    } else {
      lead = await this.leadsService.create({ contactId: contact.id, source: 'TELEGRAM', message: text, metadata: payload });
    }

    // Handle /start for consent opt-in
    if (text.trim().toLowerCase() === '/start') {
      await this.prisma.contact.update({
        where: { id: contact.id },
        data: { consentStatus: 'opted_in' },
      });
      await this.prisma.consentEvent.create({
        data: { contactId: contact.id, channel: 'TELEGRAM', action: 'opt_in', source: 'webhook' },
      });
    }

    // Handle STOP commands for consent/opt-out
    const stopPattern = /^\s*(stop|unsubscribe|cancel|opt.?out)\s*$/i;
    if (stopPattern.test(text.trim())) {
      await this.prisma.contact.update({
        where: { id: contact.id },
        data: { consentStatus: 'opted_out', optedOutAt: new Date() },
      });
      await this.prisma.consentEvent.create({
        data: { contactId: contact.id, channel: 'TELEGRAM', action: 'opt_out', source: 'webhook' },
      });
      await this.conversationsService.create({
        text: "You've been unsubscribed. You won't receive further messages from us.",
        channel: 'TELEGRAM',
        direction: 'OUTBOUND',
        leadId: lead.id,
        contactId: contact.id,
      });
    }

    await this.conversationsService.create({
      text, channel: 'TELEGRAM', direction: 'INBOUND',
      providerMessageId: msgId, leadId: lead.id, contactId: contact.id,
      metadata: payload,
    });

    const result = { contact, lead };
    await this.prisma.webhookEvent.create({
      data: { provider: 'telegram', eventType: 'telegram_message', idempotencyKey: key, rawPayload: payload, processedResult: result },
    });

    this.agentClient.trigger(lead.id, msgId || key, 'TELEGRAM', text, lead.tenantId || contact.tenantId);

    return { data: result };
  }

  private async verifyWebchatSiteKey(siteKey: string): Promise<void> {
    const integration = await this.prisma.integration.findFirst({ where: { type: 'webchat', isActive: true } });
    const configuredKey = (integration?.config as any)?.siteKey;
    if (!configuredKey || !siteKey || configuredKey !== siteKey) {
      throw new UnauthorizedException('Invalid web chat site key');
    }
  }

  // Web chat widget messages. Unlike WhatsApp/Telegram there's no external
  // provider webhook — the browser widget calls this directly, authenticated
  // by a public site key (like a Stripe publishable key, not a bearer secret)
  // generated when the client enables Web Chat in the dashboard. The visitor
  // is identified by a widget-generated sessionId, stored the same way
  // Telegram's chatId is stored — in the contact's `phone` field — so no new
  // identity model is needed.
  async handleWebchatMessage(payload: { siteKey: string; sessionId: string; text: string; name?: string; messageId?: string }, req?: any) {
    await this.verifyWebchatSiteKey(payload.siteKey);

    const key = this.idempotencyKey(['webchat', payload.sessionId, payload.messageId || this.payloadHash(payload)]);
    const existing = await this.prisma.webhookEvent.findUnique({ where: { idempotencyKey: key } });
    if (existing) return { status: 'duplicate', result: existing.processedResult };

    const contact = await this.contactsService.findOrCreate({ name: payload.name || 'Website Visitor', phone: `webchat:${payload.sessionId}` }, req);

    const existingLead = await this.prisma.lead.findFirst({
      where: { contactId: contact.id, status: { notIn: ['LOST', 'CONVERTED', 'SPAM'] } },
      orderBy: { createdAt: 'desc' },
    });

    const lead = existingLead || await this.leadsService.create({ contactId: contact.id, source: 'CHATBOT', message: payload.text });

    await this.conversationsService.create({ text: payload.text, channel: 'CHATBOT', direction: 'INBOUND', leadId: lead.id, contactId: contact.id });

    const result = { contact, lead, sessionId: payload.sessionId };
    await this.prisma.webhookEvent.create({ data: { provider: 'webchat', eventType: 'webchat_message', idempotencyKey: key, rawPayload: payload as any, processedResult: result } });

    this.agentClient.trigger(lead.id, payload.messageId || key, 'CHATBOT', payload.text, lead.tenantId || contact.tenantId);

    return { data: result };
  }

  // Public poll endpoint the widget calls to pick up the agent's replies.
  async getWebchatMessages(sessionId: string, siteKey: string, since?: string) {
    await this.verifyWebchatSiteKey(siteKey);

    const contact = await this.prisma.contact.findFirst({ where: { phone: `webchat:${sessionId}` } });
    if (!contact) return { data: [] };

    const lead = await this.prisma.lead.findFirst({ where: { contactId: contact.id }, orderBy: { createdAt: 'desc' } });
    if (!lead) return { data: [] };

    const where: any = { leadId: lead.id };
    if (since) {
      const sinceDate = new Date(since);
      if (!isNaN(sinceDate.getTime())) where.createdAt = { gt: sinceDate };
    }

    const messages = await this.prisma.conversationMessage.findMany({ where, orderBy: { createdAt: 'asc' } });
    return { data: messages };
  }

  async handlePayment(provider: string, payload: any) {
    const key = this.idempotencyKey([provider, 'payment', payload.paymentId || payload.id || this.payloadHash(payload)]);
    const existing = await this.prisma.webhookEvent.findUnique({ where: { idempotencyKey: key } });
    if (existing) return { status: 'duplicate', result: existing.processedResult };
    const result = { payment: payload, status: 'received' };
    await this.prisma.webhookEvent.create({ data: { provider, eventType: 'payment', idempotencyKey: key, rawPayload: payload, processedResult: result } });
    return { data: result };
  }

  async handleGeneric(provider: string, eventType: string, payload: any) {
    const key = this.idempotencyKey([provider, eventType, payload.id || payload.eventId || this.payloadHash(payload)]);
    const existing = await this.prisma.webhookEvent.findUnique({ where: { idempotencyKey: key } });
    if (existing) return { status: 'duplicate', result: existing.processedResult };
    const result = { received: true, eventType };
    await this.prisma.webhookEvent.create({ data: { provider, eventType, idempotencyKey: key, rawPayload: payload, processedResult: result } });
    return { data: result };
  }
}
