import { Test, TestingModule } from '@nestjs/testing';
import { ContactsService } from './contacts.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AdvancedFeaturesService } from '../advanced-features/advanced-features.service';

describe('ContactsService', () => {
  let service: ContactsService;
  let prisma: any;
  const auditLogs = { log: jest.fn().mockResolvedValue({}) };
  const advanced = { checkBlocklist: jest.fn().mockResolvedValue(false) };

  const mockContact = {
    id: 'contact-1',
    name: 'John Doe',
    email: 'john@test.com',
    phone: '+1234567890',
  };

  beforeEach(async () => {
    prisma = {
      contact: {
        findMany: jest.fn().mockResolvedValue([mockContact]),
        findUnique: jest.fn().mockResolvedValue(mockContact),
        findFirst: jest.fn(),
        create: jest.fn().mockResolvedValue(mockContact),
        upsert: jest.fn().mockResolvedValue(mockContact),
        update: jest.fn().mockResolvedValue(mockContact),
        count: jest.fn().mockResolvedValue(1),
      },
      $transaction: jest.fn((cb: any) => cb(prisma)),
    };

    const module = await Test.createTestingModule({
      providers: [
        ContactsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditLogsService, useValue: auditLogs },
        { provide: AdvancedFeaturesService, useValue: advanced },
      ],
    }).compile();

    service = module.get<ContactsService>(ContactsService);
  });

  it('should create a contact', async () => {
    const c = await service.create({ name: 'Jane', email: 'jane@test.com' });
    expect(c.email).toBe('john@test.com');
  });

  it('should dedupe by phone', async () => {
    prisma.contact.upsert.mockResolvedValue(mockContact);
    const c = await service.findOrCreate({ phone: '+1234567890', name: 'John' });
    expect(c.id).toBe('contact-1');
  });

  it('should dedupe by email', async () => {
    prisma.contact.upsert.mockResolvedValue(mockContact);
    const c = await service.findOrCreate({ email: 'john@test.com', name: 'John' });
    expect(c.id).toBe('contact-1');
  });

  describe('agent memory', () => {
    it('returns empty defaults when no memory has been recorded yet', async () => {
      prisma.contact.findUnique.mockResolvedValue({ agentMemory: null });
      const memory = await service.getMemory('contact-1');
      expect(memory).toEqual({ facts: [], notes: [], lastUpdated: null });
    });

    it('throws NotFoundException for a missing contact', async () => {
      prisma.contact.findUnique.mockResolvedValue(null);
      await expect(service.getMemory('missing')).rejects.toThrow('Contact not found');
    });

    it('upserts a fact by key instead of duplicating it', async () => {
      prisma.contact.findUnique.mockResolvedValue({ agentMemory: { facts: [{ key: 'budget', value: '5k', updatedAt: '2026-01-01T00:00:00.000Z' }], notes: [] } });
      const memory = await service.updateMemory('contact-1', { facts: [{ key: 'budget', value: '10k' }] });
      expect(memory.facts).toHaveLength(1);
      expect(memory.facts[0].value).toBe('10k');
    });

    it('appends a bounded note', async () => {
      prisma.contact.findUnique.mockResolvedValue({ agentMemory: { facts: [], notes: [] } });
      const memory = await service.updateMemory('contact-1', { note: 'Prefers WhatsApp over calls' });
      expect(memory.notes).toHaveLength(1);
      expect(memory.notes[0].text).toBe('Prefers WhatsApp over calls');
    });

    it('caps facts at 30 entries, dropping the oldest', async () => {
      const existingFacts = Array.from({ length: 30 }, (_, i) => ({ key: `fact-${i}`, value: 'x', updatedAt: '2026-01-01T00:00:00.000Z' }));
      prisma.contact.findUnique.mockResolvedValue({ agentMemory: { facts: existingFacts, notes: [] } });
      const memory = await service.updateMemory('contact-1', { facts: [{ key: 'fact-new', value: 'y' }] });
      expect(memory.facts).toHaveLength(30);
      expect(memory.facts.find((f: any) => f.key === 'fact-0')).toBeUndefined();
      expect(memory.facts.find((f: any) => f.key === 'fact-new')).toBeDefined();
    });
  });
});
