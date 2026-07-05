import { Test, TestingModule } from '@nestjs/testing';
import { ComplianceService } from './compliance.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ComplianceService', () => {
  let service: ComplianceService;
  let prisma: any;

  const mockContact = {
    id: 'contact-1',
    name: 'Jane Smith',
    email: 'jane@example.com',
    phone: '+9876543210',
    consentStatus: 'opted_in',
    consentSource: 'chat_widget',
    optedOutAt: null,
    metadata: { source: 'website' },
    tags: ['vip'],
    createdAt: new Date('2025-03-15T10:00:00Z'),
    updatedAt: new Date('2025-03-15T10:00:00Z'),
    consentEvents: [
      { id: 'ce-1', action: 'opt_in', channel: 'CHATBOT', source: 'chat_widget', createdAt: new Date('2025-03-15T10:00:00Z') },
    ],
    leads: [
      {
        id: 'lead-1',
        status: 'NEW',
        segment: 'COLD',
        source: 'CHATBOT',
        score: 10,
        createdAt: new Date('2025-03-15T10:05:00Z'),
        conversations: [{ id: 'conv-1', text: 'Hello', direction: 'INBOUND' }],
        conversions: [],
        tasks: [],
        scoreLogs: [],
        customFields: [],
        revenueRecords: [],
        timelineItems: [],
      },
    ],
    conversations: [{ id: 'conv-2', text: 'Outbound reply', direction: 'OUTBOUND' }],
    systemEvents: [{ id: 'evt-1', type: 'contact.created', createdAt: new Date() }],
  };

  const mockMinimalContact = {
    id: 'contact-2',
    name: 'Minimal User',
    email: 'minimal@example.com',
    phone: null,
    consentStatus: 'unknown',
    consentSource: null,
    optedOutAt: null,
    metadata: {},
    tags: [],
    createdAt: new Date('2025-06-01T00:00:00Z'),
    updatedAt: new Date('2025-06-01T00:00:00Z'),
    consentEvents: [],
    leads: [],
    conversations: [],
    systemEvents: [],
  };

  beforeEach(async () => {
    prisma = {
      contact: {
        findUnique: jest.fn().mockResolvedValue(mockContact),
        update: jest.fn().mockResolvedValue({}),
        count: jest.fn().mockResolvedValue(100),
      },
      consentEvent: {
        deleteMany: jest.fn().mockResolvedValue({ count: 3 }),
      },
      conversationMessage: {
        deleteMany: jest.fn().mockResolvedValue({ count: 5 }),
      },
      scoreLog: { deleteMany: jest.fn().mockResolvedValue({ count: 2 }) },
      conversion: { deleteMany: jest.fn().mockResolvedValue({ count: 1 }) },
      task: { deleteMany: jest.fn().mockResolvedValue({ count: 4 }) },
      revenueRecord: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      timelineItem: { deleteMany: jest.fn().mockResolvedValue({ count: 3 }) },
      scheduledAction: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      lead: { delete: jest.fn().mockResolvedValue({}) },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComplianceService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ComplianceService>(ComplianceService);
  });

  // ─── Export Data ────────────────────────────────────────────────

  it('should export contact data with full structure', async () => {
    const result = await service.exportData('contact-1');

    expect(result.exportedAt).toBeDefined();
    expect(result.contact).toBeDefined();
    expect(result.contact.name).toBe('Jane Smith');
    expect(result.contact.email).toBe('jane@example.com');
    expect(result.contact.phone).toBe('+9876543210');
    expect(result.contact.consentStatus).toBe('opted_in');
    expect(result.leads).toHaveLength(1);
    expect(result.conversations).toHaveLength(1);
    expect(result.events).toHaveLength(1);
  });

  it('should include consent history in data export', async () => {
    const result = await service.exportData('contact-1');

    expect(result.consentHistory).toHaveLength(1);
    expect(result.consentHistory[0].action).toBe('opt_in');
    expect(result.consentHistory[0].channel).toBe('CHATBOT');
  });

  it('should include full lead details with nested relations in export', async () => {
    const result = await service.exportData('contact-1');

    const lead = result.leads[0];
    expect(lead.status).toBe('NEW');
    expect(lead.segment).toBe('COLD');
    expect(lead.source).toBe('CHATBOT');
    expect(lead.score).toBe(10);
    expect(lead.conversations).toHaveLength(1);
    expect(lead.conversions).toEqual([]);
    expect(lead.tasks).toEqual([]);
    expect(lead.scoreHistory).toEqual([]);
    expect(lead.createdAt).toBeDefined();
  });

  it('should throw error when exporting non-existent contact', async () => {
    prisma.contact.findUnique.mockResolvedValue(null);

    await expect(service.exportData('nonexistent')).rejects.toThrow('Contact not found');
  });

  it('should handle contact with no leads or conversations in export', async () => {
    prisma.contact.findUnique.mockResolvedValue(mockMinimalContact);

    const result = await service.exportData('contact-2');

    expect(result.leads).toHaveLength(0);
    expect(result.conversations).toHaveLength(0);
    expect(result.events).toHaveLength(0);
    expect(result.consentHistory).toHaveLength(0);
  });

  it('should include optedOutAt when present', async () => {
    prisma.contact.findUnique.mockResolvedValue({
      ...mockContact,
      optedOutAt: new Date('2025-06-15T12:00:00Z'),
    });

    const result = await service.exportData('contact-1');

    expect(result.contact.optedOutAt).toBeDefined();
  });

  // ─── Erase Data ─────────────────────────────────────────────────

  it('should erase all data for a contact and return counts', async () => {
    prisma.contact.findUnique.mockResolvedValue({
      id: 'contact-1',
      leads: [{ id: 'lead-1' }],
      conversations: [{ id: 'conv-1' }],
      consentEvents: [{ id: 'ce-1' }],
    });

    const result = await service.eraseData('contact-1');

    // Each lead counts as 1, plus consent events and conversation messages
    expect(result.itemsRemoved).toBe(3 + 5 + 1); // consentEvents(3) + conversationMessages(5) + lead(1)
    expect(result.erasedAt).toBeDefined();
  });

  it('should throw error when erasing non-existent contact', async () => {
    prisma.contact.findUnique.mockResolvedValue(null);

    await expect(service.eraseData('nonexistent')).rejects.toThrow('Contact not found');
  });

  it('should mark contact as erased with placeholder data', async () => {
    prisma.contact.findUnique.mockResolvedValue({
      id: 'contact-1',
      leads: [{ id: 'lead-1' }],
      conversations: [{ id: 'conv-1' }],
      consentEvents: [{ id: 'ce-1' }],
    });

    await service.eraseData('contact-1');

    expect(prisma.contact.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'contact-1' },
        data: expect.objectContaining({
          name: '[Erased]',
          phone: null,
          consentStatus: 'opted_out',
          metadata: {},
          tags: [],
        }),
      }),
    );
  });

  it('should generate erased email with contact ID prefix', async () => {
    prisma.contact.findUnique.mockResolvedValue({
      id: 'contact-abc12345',
      leads: [{ id: 'lead-1' }],
      conversations: [{ id: 'conv-1' }],
      consentEvents: [{ id: 'ce-1' }],
    });

    await service.eraseData('contact-abc12345');

    expect(prisma.contact.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: expect.stringMatching(/^erased-contact-@erased\.local$/),
        }),
      }),
    );
  });

  it('should delete child records for each lead during erasure', async () => {
    prisma.contact.findUnique.mockResolvedValue({
      id: 'contact-1',
      leads: [
        { id: 'lead-1' },
        { id: 'lead-2' },
      ],
      conversations: [{ id: 'conv-1' }],
      consentEvents: [{ id: 'ce-1' }],
    });

    const result = await service.eraseData('contact-1');

    expect(prisma.scoreLog.deleteMany).toHaveBeenCalledTimes(2);
    expect(prisma.conversion.deleteMany).toHaveBeenCalledTimes(2);
    expect(prisma.task.deleteMany).toHaveBeenCalledTimes(2);
    expect(prisma.revenueRecord.deleteMany).toHaveBeenCalledTimes(2);
    expect(prisma.timelineItem.deleteMany).toHaveBeenCalledTimes(2);
    expect(prisma.scheduledAction.deleteMany).toHaveBeenCalledTimes(2);
    expect(prisma.lead.delete).toHaveBeenCalledTimes(2);
    // 3 consent events + 5 conversation messages + 2 leads
    expect(result.itemsRemoved).toBe(10);
  });

  it('should strip whatsapp field during erasure', async () => {
    prisma.contact.findUnique.mockResolvedValue({
      id: 'contact-1',
      leads: [],
      conversations: [],
      consentEvents: [],
    });

    await service.eraseData('contact-1');

    expect(prisma.contact.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          whatsapp: null,
        }),
      }),
    );
  });

  it('should set optedOutAt timestamp during erasure', async () => {
    prisma.contact.findUnique.mockResolvedValue({
      id: 'contact-1',
      leads: [],
      conversations: [],
      consentEvents: [],
    });

    await service.eraseData('contact-1');

    expect(prisma.contact.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          optedOutAt: expect.any(Date),
        }),
      }),
    );
  });

  // ─── Compliance Report ──────────────────────────────────────────

  it('should generate compliance report with consent breakdown', async () => {
    prisma.contact.count
      .mockResolvedValueOnce(100)  // total
      .mockResolvedValueOnce(20)   // opted_out
      .mockResolvedValueOnce(65)   // opted_in
      .mockResolvedValueOnce(15);  // unknown

    const report = await service.complianceReport();

    expect(report.totalContacts).toBe(100);
    expect(report.consentBreakdown.optedIn).toBe(65);
    expect(report.consentBreakdown.optedOut).toBe(20);
    expect(report.consentBreakdown.unknown).toBe(15);
    expect(report.consentRate).toBe('65.0%');
  });

  it('should handle zero contacts in compliance report', async () => {
    prisma.contact.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);

    const report = await service.complianceReport();

    expect(report.totalContacts).toBe(0);
    expect(report.consentRate).toBe('N/A');
  });

  it('should include dpdpCompliant flag in report', async () => {
    const report = await service.complianceReport();
    expect(report.dpdpCompliant).toBe(true);
  });

  it('should include aiDisclosureEnabled flag in report', async () => {
    const report = await service.complianceReport();
    expect(report.aiDisclosureEnabled).toBe(true);
  });

  it('should include dataRetentionDays in report', async () => {
    const report = await service.complianceReport();
    expect(report.dataRetentionDays).toBe(365);
  });

  it('should include compliance notes in report', async () => {
    const report = await service.complianceReport();
    expect(report.notes).toBeInstanceOf(Array);
    expect(report.notes.length).toBeGreaterThan(0);
    expect(report.notes[0]).toContain('AI disclosure');
  });

  it('should calculate consent rate correctly', async () => {
    prisma.contact.count
      .mockResolvedValueOnce(50)
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(35)
      .mockResolvedValueOnce(5);

    const report = await service.complianceReport();
    expect(report.consentRate).toBe('70.0%');
  });
});
