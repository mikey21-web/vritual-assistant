import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { ContactsService } from '../contacts/contacts.service';
import { LeadsService } from '../leads/leads.service';
import { ConversationsService } from '../conversations/conversations.service';
import { HttpService } from '@nestjs/axios';
import { catchError, firstValueFrom, of } from 'rxjs';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private prisma: PrismaService,
    private contactsService: ContactsService,
    private leadsService: LeadsService,
    private conversationsService: ConversationsService,
    private config: ConfigService,
    private http: HttpService,
  ) {}

  async handleChatMessage(d: { sessionId?: string; name?: string; email?: string; phone?: string; message: string }, req?: any) {
    const contactName = d.name || d.email?.split('@')[0] || `Visitor ${d.sessionId?.slice(-6) || 'anon'}`;

    const contact = await this.contactsService.findOrCreate({
      name: contactName,
      email: d.email,
      phone: d.phone,
    }, req);

    if (contact.consentStatus !== 'opted_in') {
      await this.prisma.contact.update({
        where: { id: contact.id },
        data: { consentStatus: 'opted_in' },
      });
      await this.prisma.consentEvent.create({
        data: { contactId: contact.id, channel: 'CHATBOT', action: 'opt_in', source: 'chat_widget' },
      });
    }

    const existingLead = await this.prisma.lead.findFirst({
      where: {
        contactId: contact.id,
        status: { notIn: ['LOST', 'CONVERTED', 'SPAM'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    const tenantId = contact.tenantId || 'default-tenant';

    let lead;
    if (existingLead) {
      lead = existingLead;
    } else {
      lead = await this.leadsService.create({
        contactId: contact.id,
        source: 'CHATBOT',
        message: d.message,
        metadata: { sessionId: d.sessionId, channel: 'chat_widget' },
      });
    }

    await this.conversationsService.create({
      text: d.message,
      channel: 'CHATBOT',
      direction: 'INBOUND',
      leadId: lead.id,
      contactId: contact.id,
      metadata: { sessionId: d.sessionId, source: 'chat_widget' },
    });

    const agentResponse = await this.callAgentSync(lead.id, d.sessionId || 'chat', d.message, tenantId);

    if (agentResponse) {
      await this.conversationsService.create({
        text: agentResponse,
        channel: 'CHATBOT',
        direction: 'OUTBOUND',
        leadId: lead.id,
        contactId: contact.id,
        metadata: { sessionId: d.sessionId, source: 'chat_widget_ai' },
      });
    }

    return {
      response: agentResponse || 'Thanks for reaching out! Our team will get back to you shortly.',
      contactId: contact.id,
      leadId: lead.id,
    };
  }

  private async callAgentSync(leadId: string, triggerId: string, message: string, tenantId: string): Promise<string | null> {
    const agentUrl = this.config.get<string>('AGENT_SERVICE_URL');
    const agentKey = this.config.get<string>('AGENT_INBOUND_KEY');

    if (!agentUrl) {
      this.logger.warn('AGENT_SERVICE_URL not set, returning fallback response');
      return this.getFallbackResponse();
    }

    try {
      const { data } = await firstValueFrom(
        this.http.post(`${agentUrl}/agent/chat`, {
          leadId, triggerId, channel: 'CHATBOT', tenantId,
          trigger: 'chat_widget_message',
          messageText: message,
        }, {
          headers: { 'x-agent-key': agentKey || '', 'Content-Type': 'application/json' },
          timeout: 25000,
        }).pipe(catchError(async (err) => {
          this.logger.warn(`Agent chat failed: ${err.message}, using test endpoint`);
          const fallback = await this.getTestResponse(message);
          return { data: { response: fallback } };
        })),
      );
      return data?.response || null;
    } catch (err: any) {
      this.logger.warn(`Agent chat error: ${err.message}`);
      return this.getFallbackResponse();
    }
  }

  private async getTestResponse(message: string): Promise<string> {
    const agentUrl = this.config.get<string>('AGENT_SERVICE_URL');
    const agentKey = this.config.get<string>('AGENT_INBOUND_KEY');
    try {
      const { data } = await firstValueFrom(
        this.http.post(`${agentUrl}/agent/test`, { message }, {
          headers: { 'x-agent-key': agentKey || '' },
          timeout: 5000,
        }).pipe(catchError(() => of({ data: { response: null } }))),
      );
      if (data?.response) return data.response;
    } catch {}
    return this.getFallbackResponse();
  }

  private getFallbackResponse(): string {
    return 'Thanks for your message! Our team has been notified and will get back to you shortly. In the meantime, feel free to ask any questions about our services.';
  }
}
