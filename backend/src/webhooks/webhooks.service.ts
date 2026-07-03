import { Injectable } from '@nestjs/common';
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

    this.agentClient.trigger(lead.id, msgId || key, 'WHATSAPP', text);

    return { data: result };
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
