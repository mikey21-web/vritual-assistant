import { Test, TestingModule } from '@nestjs/testing';
import { ChatService } from './chat.service';
import { PrismaService } from '../prisma/prisma.service';
import { ContactsService } from '../contacts/contacts.service';
import { LeadsService } from '../leads/leads.service';
import { ConversationsService } from '../conversations/conversations.service';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';

describe('ChatService', () => {
  let service: ChatService;
  let prisma: any;
  let contactsService: any;
  let leadsService: any;
  let conversationsService: any;
  let configService: any;
  let httpService: any;

  const mockContact = {
    id: 'contact-1',
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+1234567890',
    consentStatus: 'unknown',
    tenantId: 'default-tenant',
  };

  const mockOptedInContact = {
    ...mockContact,
    consentStatus: 'opted_in',
  };

  const mockLead = {
    id: 'lead-1',
    contactId: 'contact-1',
    status: 'NEW',
    source: 'CHATBOT',
  };

  const mockExistingLead = {
    id: 'lead-existing',
    contactId: 'contact-1',
    status: 'NEW',
    source: 'FORM',
    createdAt: new Date('2025-06-01T00:00:00Z'),
  };

  const mockConversation = {
    id: 'conv-1',
    text: 'Hello',
    channel: 'CHATBOT',
    direction: 'INBOUND',
    leadId: 'lead-1',
    contactId: 'contact-1',
  };

  beforeEach(async () => {
    prisma = {
      contact: {
        update: jest.fn().mockResolvedValue(mockOptedInContact),
      },
      consentEvent: {
        create: jest.fn().mockResolvedValue({ id: 'ce-1' }),
      },
      lead: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      qrCode: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
    };

    contactsService = {
      findOrCreate: jest.fn().mockResolvedValue(mockContact),
    };

    leadsService = {
      create: jest.fn().mockResolvedValue(mockLead),
    };

    conversationsService = {
      create: jest.fn().mockResolvedValue(mockConversation),
    };

    configService = {
      get: jest.fn((key: string) => {
        if (key === 'AGENT_SERVICE_URL') return 'https://agent.example.com';
        if (key === 'AGENT_INBOUND_KEY') return 'test-key-123';
        return undefined;
      }),
    };

    httpService = {
      post: jest.fn().mockReturnValue(of({ data: { response: 'Hello! How can I help you today?' } })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: PrismaService, useValue: prisma },
        { provide: ContactsService, useValue: contactsService },
        { provide: LeadsService, useValue: leadsService },
        { provide: ConversationsService, useValue: conversationsService },
        { provide: ConfigService, useValue: configService },
        { provide: HttpService, useValue: httpService },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
  });

  // ─── Basic flow ─────────────────────────────────────────────────

  it('should handle chat message with consent opt-in and agent response', async () => {
    const result = await service.handleChatMessage({
      sessionId: 'sess-123',
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+1234567890',
      message: 'I need help with pricing',
    });

    expect(contactsService.findOrCreate).toHaveBeenCalledWith(
      { name: 'John Doe', email: 'john@example.com', phone: '+1234567890' },
      undefined,
    );
    expect(prisma.contact.update).toHaveBeenCalledWith(
      { where: { id: 'contact-1' }, data: { consentStatus: 'opted_in' } },
    );
    expect(prisma.consentEvent.create).toHaveBeenCalledWith(
      { data: { contactId: 'contact-1', channel: 'CHATBOT', action: 'opt_in', source: 'chat_widget' } },
    );
    expect(leadsService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        contactId: 'contact-1',
        source: 'CHATBOT',
        message: 'I need help with pricing',
      }),
    );
    expect(conversationsService.create).toHaveBeenCalledTimes(1);
    expect(conversationsService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        text: 'I need help with pricing',
        direction: 'INBOUND',
        channel: 'CHATBOT',
        leadId: 'lead-1',
        contactId: 'contact-1',
      }),
    );
    expect(result.response).toBe('Hello! How can I help you today?');
    expect(result.contactId).toBe('contact-1');
    expect(result.leadId).toBe('lead-1');
  });

  it('should not create consent event when contact already opted in', async () => {
    contactsService.findOrCreate.mockResolvedValue(mockOptedInContact);

    await service.handleChatMessage({
      sessionId: 'sess-123',
      email: 'john@example.com',
      message: 'Hello',
    });

    expect(prisma.contact.update).not.toHaveBeenCalled();
    expect(prisma.consentEvent.create).not.toHaveBeenCalled();
  });

  it('should use existing lead instead of creating a new one', async () => {
    contactsService.findOrCreate.mockResolvedValue(mockOptedInContact);
    prisma.lead.findFirst.mockResolvedValue(mockExistingLead);

    await service.handleChatMessage({
      sessionId: 'sess-123',
      email: 'john@example.com',
      message: 'Follow-up question',
    });

    expect(leadsService.create).not.toHaveBeenCalled();
    expect(conversationsService.create).toHaveBeenCalledWith(
      expect.objectContaining({ leadId: 'lead-existing' }),
    );
  });

  // ─── Name resolution ────────────────────────────────────────────

  it('should derive contact name from email when name not provided', async () => {
    contactsService.findOrCreate.mockResolvedValue(mockOptedInContact);

    await service.handleChatMessage({
      sessionId: 'sess-123',
      email: 'jane@example.com',
      message: 'Hi',
    });

    expect(contactsService.findOrCreate).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'jane' }),
      undefined,
    );
  });

  it('should derive contact name from session ID when no name or email', async () => {
    contactsService.findOrCreate.mockResolvedValue(mockOptedInContact);

    await service.handleChatMessage({
      sessionId: 'abcdef123456',
      message: 'Hi',
    });

    expect(contactsService.findOrCreate).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Visitor 123456' }),
      undefined,
    );
  });

  it('should use "anon" when no name, email, or sessionId', async () => {
    contactsService.findOrCreate.mockResolvedValue(mockOptedInContact);

    await service.handleChatMessage({
      message: 'Hi',
    });

    expect(contactsService.findOrCreate).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Visitor anon' }),
      undefined,
    );
  });

  // ─── Agent fallback scenarios ───────────────────────────────────

  it('should return fallback message when AGENT_SERVICE_URL is not configured', async () => {
    contactsService.findOrCreate.mockResolvedValue(mockOptedInContact);
    configService.get.mockImplementation((key: string) => {
      if (key === 'AGENT_SERVICE_URL') return undefined;
      if (key === 'AGENT_INBOUND_KEY') return 'test-key-123';
      return undefined;
    });

    const result = await service.handleChatMessage({
      sessionId: 'sess-123',
      email: 'john@example.com',
      message: 'Pricing info',
    });

    expect(httpService.post).not.toHaveBeenCalled();
    expect(result.response).toContain('Thanks for your message');
    expect(result.leadId).toBe('lead-1');
  });

  it('should attempt test endpoint when primary agent call fails', async () => {
    contactsService.findOrCreate.mockResolvedValue(mockOptedInContact);
    // First call to /agent/chat throws
    httpService.post
      .mockReturnValueOnce(throwError(() => new Error('Agent unavailable')))
      // Second call to /agent/test succeeds
      .mockReturnValueOnce(of({ data: { response: 'Test fallback response' } }));

    const result = await service.handleChatMessage({
      sessionId: 'sess-123',
      email: 'john@example.com',
      message: 'Help',
    });

    expect(httpService.post).toHaveBeenCalledTimes(2);
    expect(httpService.post).toHaveBeenNthCalledWith(1,
      'https://agent.example.com/agent/chat',
      expect.any(Object),
      expect.objectContaining({ timeout: 25000 }),
    );
    expect(httpService.post).toHaveBeenNthCalledWith(2,
      'https://agent.example.com/agent/test',
      expect.any(Object),
      expect.objectContaining({ timeout: 5000 }),
    );
    expect(result.response).toBe('Test fallback response');
  });

  it('should return fallback when both agent and test endpoints fail', async () => {
    contactsService.findOrCreate.mockResolvedValue(mockOptedInContact);
    httpService.post
      .mockReturnValueOnce(throwError(() => new Error('Agent unavailable')))
      .mockReturnValueOnce(throwError(() => new Error('Test endpoint also down')));

    const result = await service.handleChatMessage({
      sessionId: 'sess-123',
      email: 'john@example.com',
      message: 'Help',
    });

    expect(result.response).toContain('Our team has been notified');
  });

  it('should handle agent returning null response gracefully', async () => {
    contactsService.findOrCreate.mockResolvedValue(mockOptedInContact);
    httpService.post.mockReturnValue(of({ data: { response: null } }));

    const result = await service.handleChatMessage({
      sessionId: 'sess-123',
      email: 'john@example.com',
      message: 'Hi',
    });

    // Only inbound conversation created, no outbound
    expect(conversationsService.create).toHaveBeenCalledTimes(1);
    expect(result.response).toContain('Thanks for reaching out');
  });

  // ─── Session & tenant handling ──────────────────────────────────

  it('should pass sessionId as triggerId to agent call', async () => {
    contactsService.findOrCreate.mockResolvedValue(mockOptedInContact);

    await service.handleChatMessage({
      sessionId: 'my-session-42',
      email: 'john@example.com',
      message: 'Hello',
    });

    expect(httpService.post).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ triggerId: 'my-session-42' }),
      expect.any(Object),
    );
  });

  it('should use "chat" as default triggerId when no sessionId', async () => {
    contactsService.findOrCreate.mockResolvedValue(mockOptedInContact);

    await service.handleChatMessage({
      email: 'john@example.com',
      message: 'Hello',
    });

    expect(httpService.post).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ triggerId: 'chat' }),
      expect.any(Object),
    );
  });

  it('should pass tenantId from contact to agent call', async () => {
    contactsService.findOrCreate.mockResolvedValue({
      ...mockOptedInContact,
      tenantId: 'tenant-alpha',
    });

    await service.handleChatMessage({
      sessionId: 'sess-123',
      email: 'john@example.com',
      message: 'Help',
    });

    expect(httpService.post).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ tenantId: 'tenant-alpha' }),
      expect.any(Object),
    );
  });

  it('should use default-tenant when contact has no tenantId', async () => {
    contactsService.findOrCreate.mockResolvedValue({
      ...mockOptedInContact,
      tenantId: null,
    });

    await service.handleChatMessage({
      sessionId: 'sess-123',
      email: 'john@example.com',
      message: 'Help',
    });

    expect(httpService.post).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ tenantId: 'default-tenant' }),
      expect.any(Object),
    );
  });

  // ─── Metadata ───────────────────────────────────────────────────

  it('should include correct channel metadata in conversation creates', async () => {
    contactsService.findOrCreate.mockResolvedValue(mockOptedInContact);

    await service.handleChatMessage({
      sessionId: 'sess-999',
      email: 'john@example.com',
      message: 'I need support',
    });

    expect(conversationsService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: { sessionId: 'sess-999', source: 'chat_widget' },
      }),
    );
  });

  // ─── Error propagation ──────────────────────────────────────────

  it('should propagate errors from contactsService.findOrCreate', async () => {
    contactsService.findOrCreate.mockRejectedValue(new Error('Database connection failed'));

    await expect(service.handleChatMessage({
      sessionId: 'sess-123',
      email: 'john@example.com',
      message: 'Hello',
    })).rejects.toThrow('Database connection failed');
  });

  it('should propagate errors from leadsService.create', async () => {
    contactsService.findOrCreate.mockResolvedValue(mockOptedInContact);
    leadsService.create.mockRejectedValue(new Error('Unique constraint violation'));

    await expect(service.handleChatMessage({
      sessionId: 'sess-123',
      email: 'john@example.com',
      message: 'Hello',
    })).rejects.toThrow('Unique constraint violation');
  });

  it('should propagate errors from conversationsService.create', async () => {
    contactsService.findOrCreate.mockResolvedValue(mockOptedInContact);
    conversationsService.create.mockRejectedValue(new Error('Foreign key violation'));

    await expect(service.handleChatMessage({
      sessionId: 'sess-123',
      email: 'john@example.com',
      message: 'Hello',
    })).rejects.toThrow('Foreign key violation');
  });

  // ─── Input handling ─────────────────────────────────────────────

  it('should handle missing phone gracefully', async () => {
    contactsService.findOrCreate.mockResolvedValue(mockOptedInContact);

    const result = await service.handleChatMessage({
      sessionId: 'sess-123',
      email: 'john@example.com',
      message: 'No phone',
    });

    expect(result.response).toBeDefined();
  });

  it('should handle missing email gracefully', async () => {
    contactsService.findOrCreate.mockResolvedValue(mockOptedInContact);

    const result = await service.handleChatMessage({
      sessionId: 'sess-123',
      name: 'John',
      message: 'No email',
    });

    expect(result.response).toBeDefined();
  });

  // ─── QR attribution ─────────────────────────────────────────────

  it('should attribute a new lead to QR_CODE when a valid qrCodeId is passed', async () => {
    contactsService.findOrCreate.mockResolvedValue(mockOptedInContact);
    prisma.qrCode.findUnique.mockResolvedValue({ id: 'qr-1' });

    await service.handleChatMessage({
      sessionId: 'sess-123',
      email: 'john@example.com',
      message: 'Hi from the QR landing page',
      qrCodeId: 'qr-1',
    });

    expect(prisma.qrCode.findUnique).toHaveBeenCalledWith({ where: { id: 'qr-1' } });
    expect(leadsService.create).toHaveBeenCalledWith(expect.objectContaining({ source: 'QR_CODE' }));
  });

  it('should fall back to CHATBOT when the passed qrCodeId does not exist', async () => {
    contactsService.findOrCreate.mockResolvedValue(mockOptedInContact);
    prisma.qrCode.findUnique.mockResolvedValue(null);

    await service.handleChatMessage({
      sessionId: 'sess-123',
      email: 'john@example.com',
      message: 'Hi',
      qrCodeId: 'bogus',
    });

    expect(leadsService.create).toHaveBeenCalledWith(expect.objectContaining({ source: 'CHATBOT' }));
  });

  it('should not attribute to QR_CODE when reusing an existing lead', async () => {
    contactsService.findOrCreate.mockResolvedValue(mockOptedInContact);
    prisma.lead.findFirst.mockResolvedValue(mockExistingLead);

    await service.handleChatMessage({
      sessionId: 'sess-123',
      email: 'john@example.com',
      message: 'Follow-up',
      qrCodeId: 'qr-1',
    });

    expect(leadsService.create).not.toHaveBeenCalled();
    expect(prisma.qrCode.findUnique).not.toHaveBeenCalled();
  });
});
