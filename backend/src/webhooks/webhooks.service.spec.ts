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
});
