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
      entry: [{
        changes: [{
          value: {
            messages: [{ id: 'msg-1', from: '+1234567890', text: { body: 'Hello' }, timestamp: '1234567890' }],
            contacts: [{ profile: { name: 'John' } }],
          },
        }],
      }],
    });
    expect(result.data.lead.id).toBe('lead-1');
  });

  // ── mobile-app generic webhook ──────────────────

  it('should create a lead from a mobile app event with contact info', async () => {
    const result: any = await service.handleGeneric('mobile-app', 'app_event', {
      name: 'Jane', email: 'jane@test.com', message: 'Interested in premium plan',
    });
    expect(contacts.findOrCreate).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Jane', email: 'jane@test.com' }),
    );
    expect(leads.create).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'MOBILE_APP' }),
    );
    expect(conversations.create).toHaveBeenCalledWith(
      expect.objectContaining({ text: 'Interested in premium plan', channel: 'SYSTEM' }),
    );
    expect(result.data.lead.id).toBe('lead-1');
  });

  it('should reuse an existing open lead instead of creating a new one', async () => {
    prisma.lead.findFirst.mockResolvedValue(mockLead);
    await service.handleGeneric('mobile-app', 'app_event', { phone: '+1234567890' });
    expect(leads.create).not.toHaveBeenCalled();
  });

  it('should not create a lead for a mobile app event with no contact info', async () => {
    const result: any = await service.handleGeneric('mobile-app', 'app_event', { event: 'app_opened' });
    expect(leads.create).not.toHaveBeenCalled();
    expect(contacts.findOrCreate).not.toHaveBeenCalled();
    expect(result.data.received).toBe(true);
  });

  it('should not create a conversation message when the mobile app event has no message', async () => {
    await service.handleGeneric('mobile-app', 'app_event', { email: 'jane@test.com' });
    expect(conversations.create).not.toHaveBeenCalled();
  });
});
