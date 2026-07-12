import { Test, TestingModule } from '@nestjs/testing';
import { WebhooksService } from './webhooks.service';
import { PrismaService } from '../prisma/prisma.service';
import { ContactsService } from '../contacts/contacts.service';
import { LeadsService } from '../leads/leads.service';
import { ConversationsService } from '../conversations/conversations.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AgentClientService } from '../agent/agent-client.service';

describe('WebhooksService', () => {
  let service: WebhooksService;
  let prisma: any;
  let contacts: any;
  let leads: any;
  let conversations: any;
  const auditLogs = { log: jest.fn().mockResolvedValue({}) };
  const agentClient = { trigger: jest.fn().mockResolvedValue(undefined) };

  const mockContact = { id: 'contact-1', name: 'John', phone: '+1234567890' };
  const mockLead = { id: 'lead-1', status: 'NEW', contactId: 'contact-1' };

  beforeEach(async () => {
    prisma = {
      webhookEvent: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({}),
      },
      lead: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      contact: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      integration: {
        findFirst: jest.fn().mockResolvedValue({ config: { siteKey: 'test-site-key' } }),
      },
      conversationMessage: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    contacts = {
      findOrCreate: jest.fn().mockResolvedValue(mockContact),
    };
    leads = {
      create: jest.fn().mockResolvedValue(mockLead),
    };
    conversations = {
      create: jest.fn().mockResolvedValue({}),
    };

    const module = await Test.createTestingModule({
      providers: [
        WebhooksService,
        { provide: PrismaService, useValue: prisma },
        { provide: ContactsService, useValue: contacts },
        { provide: LeadsService, useValue: leads },
        { provide: ConversationsService, useValue: conversations },
        { provide: AuditLogsService, useValue: auditLogs },
        { provide: AgentClientService, useValue: agentClient },
      ],
    }).compile();

    service = module.get<WebhooksService>(WebhooksService);
  });

  it('should handle form submission webhook', async () => {
    const result: any = await service.handleFormSubmit('external', {
      name: 'John', email: 'john@test.com', phone: '+1234567890', message: 'Interested',
    });
    expect(result.data.contact.id).toBe('contact-1');
    expect(result.data.lead.id).toBe('lead-1');
  });

  it('should prevent duplicate webhook processing', async () => {
    prisma.webhookEvent.findUnique.mockResolvedValue({
      idempotencyKey: 'external:{"name":"John"}',
      processedResult: { status: 'duplicate' },
    });
    const result: any = await service.handleFormSubmit('external', { name: 'John' });
    expect(result.status).toBe('duplicate');
  });

  it('should handle WhatsApp webhook', async () => {
    const result: any = await service.handleWhatsApp('whatsapp', {
      messageId: 'msg-1', from: '+1234567890', text: 'Hello', contactName: 'John',
    });
    expect(result.data.lead.id).toBe('lead-1');
  });

  describe('web chat widget', () => {
    it('rejects a message with the wrong site key', async () => {
      await expect(service.handleWebchatMessage({ siteKey: 'wrong-key', sessionId: 'sess-1', text: 'Hi' }))
        .rejects.toThrow('Invalid web chat site key');
      expect(contacts.findOrCreate).not.toHaveBeenCalled();
    });

    it('rejects when web chat has never been enabled', async () => {
      prisma.integration.findFirst.mockResolvedValue(null);
      await expect(service.handleWebchatMessage({ siteKey: 'test-site-key', sessionId: 'sess-1', text: 'Hi' }))
        .rejects.toThrow('Invalid web chat site key');
    });

    it('creates a contact keyed by sessionId and triggers the agent', async () => {
      const result: any = await service.handleWebchatMessage({ siteKey: 'test-site-key', sessionId: 'sess-1', text: 'Hi there', name: 'Visitor' });
      expect(contacts.findOrCreate).toHaveBeenCalledWith({ name: 'Visitor', phone: 'webchat:sess-1' }, undefined);
      expect(conversations.create).toHaveBeenCalledWith(expect.objectContaining({ channel: 'CHATBOT', direction: 'INBOUND' }));
      expect(agentClient.trigger).toHaveBeenCalledWith('lead-1', expect.any(String), 'CHATBOT', 'Hi there', undefined);
      expect(result.data.sessionId).toBe('sess-1');
    });

    it('reuses an existing active lead instead of creating a new one', async () => {
      prisma.lead.findFirst.mockResolvedValue({ id: 'lead-existing', status: 'ENGAGED', contactId: 'contact-1' });
      await service.handleWebchatMessage({ siteKey: 'test-site-key', sessionId: 'sess-1', text: 'Follow up' });
      expect(leads.create).not.toHaveBeenCalled();
    });

    it('polling with the wrong site key is rejected', async () => {
      await expect(service.getWebchatMessages('sess-1', 'wrong-key')).rejects.toThrow('Invalid web chat site key');
    });

    it('polling for an unknown session returns an empty list', async () => {
      const result = await service.getWebchatMessages('sess-unknown', 'test-site-key');
      expect(result).toEqual({ data: [] });
    });

    it('polling returns messages for the session\'s most recent lead', async () => {
      prisma.contact.findFirst.mockResolvedValue(mockContact);
      prisma.lead.findFirst.mockResolvedValue(mockLead);
      prisma.conversationMessage.findMany.mockResolvedValue([{ id: 'msg-1', text: 'hello back', direction: 'OUTBOUND' }]);
      const result = await service.getWebchatMessages('sess-1', 'test-site-key');
      expect(prisma.conversationMessage.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { leadId: 'lead-1' } }));
      expect(result.data).toHaveLength(1);
    });
  });
});
