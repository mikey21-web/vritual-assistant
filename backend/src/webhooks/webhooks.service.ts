import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ContactsService } from '../contacts/contacts.service';
import { LeadsService } from '../leads/leads.service';
import { ConversationsService } from '../conversations/conversations.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AgentClientService } from '../agent/agent-client.service';
import { envelopeDecrypt } from '../shared/crypto.util';
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

    // Auto opt-in on any inbound message (implicit consent via Telegram message)
    if (contact.consentStatus !== 'opted_in') {
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

  async handlePayment(provider: string, payload: any) {
    const key = this.idempotencyKey([provider, 'payment', payload.paymentId || payload.id || this.payloadHash(payload)]);
    const existing = await this.prisma.webhookEvent.findUnique({ where: { idempotencyKey: key } });
    if (existing) return { status: 'duplicate', result: existing.processedResult };
    const result = { payment: payload, status: 'received' };
    await this.prisma.webhookEvent.create({ data: { provider, eventType: 'payment', idempotencyKey: key, rawPayload: payload, processedResult: result } });
    return { data: result };
  }

  async handleSocialWebhook(payload: any, req?: any) {
    const source = (payload.source || 'social').toLowerCase();
    const key = this.idempotencyKey([source, 'social_lead', payload.leadId || payload.email || payload.phone || this.payloadHash(payload)]);
    const existing = await this.prisma.webhookEvent.findUnique({ where: { idempotencyKey: key } });
    if (existing) return { status: 'duplicate', result: existing.processedResult };

    const contact = await this.contactsService.findOrCreate({
      name: payload.name,
      email: payload.email,
      phone: payload.phone,
    }, req);

    const mappedSource = this.mapSocialSource(source);

    const lead = await this.leadsService.create({
      contactId: contact.id,
      source: mappedSource,
      message: payload.message || '',
      metadata: {
        socialSource: source,
        originalPayload: payload,
        ...(payload.metadata || {}),
      },
    });

    await this.conversationsService.create({
      text: payload.message || 'Social media lead captured',
      channel: 'SOCIAL_DM',
      direction: 'INBOUND',
      leadId: lead.id,
      contactId: contact.id,
      metadata: { source, originalPayload: payload },
    });

    const result = { contact, lead };
    await this.prisma.webhookEvent.create({
      data: { provider: source, eventType: 'social_lead', idempotencyKey: key, rawPayload: payload, processedResult: result },
    });
    await this.auditLogs.log('webhook_processed', 'WebhookEvent', key, undefined, { provider: source, eventType: 'social_lead' });

    this.agentClient.trigger(lead.id, key, 'SOCIAL_DM', payload.message || '', lead.tenantId || contact.tenantId);

    return { data: { leadId: lead.id, contactId: contact.id } };
  }

  async handleVoiceIncoming(payload: any, req?: any) {
    const callSid = payload.CallSid || payload.callSid;
    if (!callSid) return { status: 'ignored', reason: 'no CallSid' };

    const key = this.idempotencyKey(['twilio', 'voice_incoming', callSid]);
    const existing = await this.prisma.webhookEvent.findUnique({ where: { idempotencyKey: key } });
    if (existing) return { status: 'duplicate', result: existing.processedResult };

    const fromNumber = payload.From || payload.from || '';
    const toNumber = payload.To || payload.to || '';

    // Find or create a contact by phone number
    const contact = await this.contactsService.findOrCreate({
      name: payload.callerName || `Caller ${fromNumber}`,
      phone: fromNumber,
    }, req);

    // Check for an active lead or create one
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
      lead = await this.leadsService.create({
        contactId: contact.id,
        source: 'PHONE_CALL',
        message: `Incoming call from ${fromNumber}`,
        metadata: { callSid, from: fromNumber, to: toNumber, callStatus: payload.CallStatus },
      });
    }

    await this.conversationsService.create({
      text: `Incoming call from ${fromNumber} (SID: ${callSid})`,
      channel: 'PHONE_CALL',
      direction: 'INBOUND',
      providerMessageId: callSid,
      leadId: lead.id,
      contactId: contact.id,
      metadata: payload,
    });

    const result = { contact, lead, callSid };
    await this.prisma.webhookEvent.create({
      data: { provider: 'twilio', eventType: 'voice_incoming', idempotencyKey: key, rawPayload: payload, processedResult: result },
    });
    await this.auditLogs.log('webhook_processed', 'WebhookEvent', key, undefined, { provider: 'twilio', eventType: 'voice_incoming' });

    this.agentClient.trigger(lead.id, callSid, 'PHONE_CALL', `Incoming call from ${fromNumber}`, lead.tenantId || contact.tenantId);

    return { data: result };
  }

  async handleVoiceStatus(payload: any) {
    const callSid = payload.CallSid || payload.callSid;
    if (!callSid) return { status: 'ignored', reason: 'no CallSid' };

    const key = this.idempotencyKey(['twilio', 'voice_status', callSid, payload.CallStatus || 'status']);
    const existing = await this.prisma.webhookEvent.findUnique({ where: { idempotencyKey: key } });
    if (existing) return { status: 'duplicate', result: existing.processedResult };

    const result = {
      callSid,
      status: payload.CallStatus,
      direction: payload.Direction,
      from: payload.From,
      to: payload.To,
      duration: payload.CallDuration || payload.Duration,
      recordingUrl: payload.RecordingUrl,
      answeredBy: payload.AnsweredBy,
      timestamp: payload.Timestamp,
    };

    // Find the conversation message associated with this call to update delivery status
    if (payload.CallStatus === 'completed') {
      await this.prisma.conversationMessage.updateMany({
        where: { providerMessageId: callSid },
        data: { deliveryStatus: 'delivered' },
      });
    } else if (payload.CallStatus === 'busy' || payload.CallStatus === 'failed' || payload.CallStatus === 'no-answer') {
      await this.prisma.conversationMessage.updateMany({
        where: { providerMessageId: callSid },
        data: { deliveryStatus: 'failed' },
      });
    }

    await this.prisma.webhookEvent.create({
      data: {
        provider: 'twilio',
        eventType: `voice_status_${payload.CallStatus || 'unknown'}`,
        idempotencyKey: key,
        rawPayload: payload,
        processedResult: result,
      },
    });

    return { data: result };
  }

  async handleGeneric(provider: string, eventType: string, payload: any) {
    const key = this.idempotencyKey([provider, eventType, payload.id || payload.eventId || this.payloadHash(payload)]);
    const existing = await this.prisma.webhookEvent.findUnique({ where: { idempotencyKey: key } });
    if (existing) return { status: 'duplicate', result: existing.processedResult };

    // For chatbot messages, create contact+lead+conversation and trigger agent
    if (provider === 'chatbot' && eventType === 'chatbot_message') {
      const text = payload.message || payload.text || '';
      const contactName = payload.name || payload.contactName || 'Chat Visitor';
      const contact = await this.contactsService.findOrCreate({
        name: contactName,
        email: payload.email,
        phone: payload.phone || payload.telephone,
      });

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
        lead = await this.leadsService.create({
          contactId: contact.id,
          source: 'CHATBOT',
          message: text,
          metadata: { ...payload, channel: 'chat_widget' },
        });
      }

      await this.conversationsService.create({
        text,
        channel: 'CHATBOT',
        direction: 'INBOUND',
        leadId: lead.id,
        contactId: contact.id,
        metadata: payload,
      });

      const result = { contact, lead };
      await this.prisma.webhookEvent.create({
        data: { provider, eventType, idempotencyKey: key, rawPayload: payload, processedResult: result },
      });

      this.agentClient.trigger(lead.id, key, 'CHATBOT', text, lead.tenantId || contact.tenantId);

      return { data: result };
    }

    const result = { received: true, eventType };
    await this.prisma.webhookEvent.create({ data: { provider, eventType, idempotencyKey: key, rawPayload: payload, processedResult: result } });
    return { data: result };
  }

  // -- Private helpers --

  private mapSocialSource(source: string): any {
    const map: Record<string, any> = {
      facebook: 'SOCIAL_MEDIA',
      instagram: 'SOCIAL_MEDIA',
      linkedin: 'SOCIAL_MEDIA',
      twitter: 'SOCIAL_MEDIA',
      tiktok: 'SOCIAL_MEDIA',
      social: 'SOCIAL_MEDIA',
    };
    return map[source] || 'SOCIAL_MEDIA';
  }

  async findWebhookStatuses() {
    const providers = ['whatsapp', 'telegram', 'social', 'voice', 'forms', 'chatbot', 'mobile-app', 'payments'];
    const apiUrl = process.env.API_URL || 'http://localhost:3001';

    const results = await Promise.all(
      providers.map(async (type) => {
        const lastEvent = await this.prisma.webhookEvent.findFirst({
          where: { provider: type },
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true, status: true },
        });

        const integration = await this.prisma.integration.findFirst({
          where: {
            OR: [
              { type: type.toUpperCase() },
              { type: { contains: type, mode: 'insensitive' } },
            ],
          },
          select: { isActive: true, status: true, config: true },
        });

        const hasEvents = lastEvent !== null;
        const isConfigured = integration?.isActive ?? hasEvents;

        // Probe external connectivity for configured integrations
        let connectivityStatus: 'ok' | 'unreachable' | 'unknown' = 'unknown';
        if (integration?.isActive) {
          connectivityStatus = await this.probeProvider(type, integration.config as any);
        }

        return {
          type,
          url: `${apiUrl}/webhooks/${type}`,
          status: isConfigured ? (hasEvents ? 'active' : 'configured') : 'available',
          lastReceived: lastEvent?.createdAt?.toISOString() || null,
          connectivity: connectivityStatus,
        };
      }),
    );

    return results;
  }

  private async probeProvider(type: string, config: any): Promise<'ok' | 'unreachable' | 'unknown'> {
    const decrypted = typeof config === 'object' ? config : {};
    const timeoutMs = 5000;

    try {
      switch (type) {
        case 'whatsapp': {
          const token = decrypted?.WHATSAPP_ACCESS_TOKEN || decrypted?.accessToken;
          const phoneId = decrypted?.WHATSAPP_PHONE_ID || decrypted?.phoneId;
          if (!token || !phoneId) return 'unknown';
          const resp = await this.fetchWithTimeout(
            `https://graph.facebook.com/v18.0/${phoneId}`,
            { headers: { Authorization: `Bearer ${token}` }, timeout: timeoutMs },
          );
          return resp?.status === 200 ? 'ok' : 'unreachable';
        }
        case 'telegram': {
          const botToken = decrypted?.TELEGRAM_BOT_TOKEN || decrypted?.botToken;
          if (!botToken) return 'unknown';
          const resp = await this.fetchWithTimeout(
            `https://api.telegram.org/bot${botToken}/getMe`,
            { timeout: timeoutMs },
          );
          return resp?.status === 200 ? 'ok' : 'unreachable';
        }
        case 'payments': {
          const secretKey = decrypted?.STRIPE_SECRET_KEY || decrypted?.secretKey;
          if (!secretKey) return 'unknown';
          const resp = await this.fetchWithTimeout(
            `https://api.stripe.com/v1/account`,
            { headers: { Authorization: `Bearer ${secretKey}` }, timeout: timeoutMs },
          );
          return resp?.status === 200 ? 'ok' : 'unreachable';
        }
        case 'voice': {
          const accountSid = decrypted?.TWILIO_ACCOUNT_SID || decrypted?.accountSid;
          const authToken = decrypted?.TWILIO_AUTH_TOKEN || decrypted?.authToken;
          if (!accountSid || !authToken) return 'unknown';
          const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
          const resp = await this.fetchWithTimeout(
            `https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`,
            { headers: { Authorization: `Basic ${auth}` }, timeout: timeoutMs },
          );
          return resp?.status === 200 ? 'ok' : 'unreachable';
        }
        default:
          return 'unknown';
      }
    } catch {
      return 'unreachable';
    }
  }

  private async fetchWithTimeout(url: string, opts: { headers?: Record<string, string>; timeout: number }): Promise<Response | null> {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), opts.timeout);
      const response = await fetch(url, {
        headers: opts.headers,
        signal: controller.signal,
      });
      clearTimeout(timer);
      return response;
    } catch {
      return null;
    }
  }

  // === Outbound webhook subscriptions ===
  async createOutboundWebhook(data: { name: string; url: string; events: string[]; secret?: string }) {
    if (!data.url || !data.events?.length) throw new BadRequestException('url and events are required');
    return this.prisma.outboundWebhook.create({
      data: { name: data.name, url: data.url, events: data.events, secret: data.secret || '', tenantId: 'default-tenant' },
    });
  }

  async listOutboundWebhooks() {
    return this.prisma.outboundWebhook.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async deleteOutboundWebhook(id: string) {
    await this.prisma.outboundWebhook.delete({ where: { id } });
    return { deleted: true };
  }

  async testOutboundWebhook(id: string) {
    const wh = await this.prisma.outboundWebhook.findUnique({ where: { id } });
    if (!wh) throw new NotFoundException('Webhook not found');
    return this.sendWebhookPayload(wh, { event: 'test', data: { message: 'This is a test event from DeploySafe CRM' } });
  }

  // Called by the event system when any AutomationEvent fires
  async dispatchToOutboundWebhooks(eventType: string, payload: any) {
    const hooks = await this.prisma.outboundWebhook.findMany({
      where: { events: { has: eventType }, active: true },
    });
    const results = await Promise.allSettled(
      hooks.map(wh => this.sendWebhookPayload(wh, { event: eventType, data: payload })),
    );
    return { dispatched: hooks.length, results: results.map(r => r.status) };
  }

  private async sendWebhookPayload(wh: { url: string; secret?: string; id: string }, body: any) {
    const payload = JSON.stringify(body);
    const signature = wh.secret
      ? crypto.createHmac('sha256', wh.secret).update(payload).digest('hex')
      : '';
    try {
      const res = await fetch(wh.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-DeploySafe-Signature': signature,
          'User-Agent': 'DeploySafe-CRM-Webhook/1.0',
        },
        body: payload,
      });
      return { webhookId: wh.id, status: res.ok ? 'success' : 'failed', statusCode: res.status };
    } catch (e: any) {
      return { webhookId: wh.id, status: 'error', error: e.message };
    }
  }

  // === Inbound generic webhook ===
  async handleInboundWebhook(integrationId: string, payload: any) {
    const integration = await this.prisma.integration.findUnique({ where: { id: integrationId } });
    if (!integration) throw new NotFoundException('Integration not found');

    const config = typeof integration.config === 'object' ? integration.config as Record<string, any> : {};

    // Map external fields to lead fields using the integration's field mappings
    const name = payload.name || payload.contactName || payload.Name || payload.full_name || '';
    const email = payload.email || payload.Email || payload.EmailAddress || '';
    const phone = payload.phone || payload.Phone || payload.PhoneNumber || '';
    const message = payload.message || payload.Message || payload.body || payload.Body || '';

    const contact = await this.contactsService.findOrCreate({ name, email, phone }, undefined);
    const lead = await this.leadsService.create({
      contactId: contact.id,
      source: (config.sourceType as any) || 'FORM',
      message,
      metadata: { integrationId, originalPayload: payload, ...config },
    });
    return { leadId: lead.id, contactId: contact.id };
  }

  async testWebhookEndpoint(type: string) {
    const lastEvent = await this.prisma.webhookEvent.findFirst({
      where: { provider: type },
      orderBy: { createdAt: 'desc' },
    });

    const integration = await this.prisma.integration.findFirst({
      where: {
        OR: [
          { type: type.toUpperCase() },
          { type: { contains: type, mode: 'insensitive' } },
        ],
      },
      select: { isActive: true, config: true },
    });

    const connectivity = await this.probeProvider(type, integration?.config as any || {});
    const isReachable = lastEvent || integration?.isActive;

    return {
      status: isReachable ? 'ok' : 'not_configured',
      message: isReachable
        ? `${type} webhook is configured and receiving data`
        : `${type} webhook is not yet configured. Set up the endpoint URL in your external service.`,
      lastEvent: lastEvent?.createdAt?.toISOString() || null,
      connectivity,
    };
  }
}
