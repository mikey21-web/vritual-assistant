import { Test, TestingModule } from '@nestjs/testing';
import { LeadsService } from './leads.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AdvancedFeaturesService } from '../advanced-features/advanced-features.service';
import { EventsService } from '../events/events.service';
import { NotificationsService } from '../notifications/notifications.service';

describe('LeadsService', () => {
  let service: LeadsService;
  let prisma: any;
  const auditLogs = { log: jest.fn().mockResolvedValue({}) };
  const advanced = { checkBlocklist: jest.fn().mockResolvedValue(false) };
  const events = { emit: jest.fn().mockResolvedValue({}) };
  const notifications = { create: jest.fn().mockResolvedValue(undefined) };

  const mockLead = {
    id: 'lead-1',
    status: 'NEW',
    segment: 'COLD',
    source: 'FORM',
    score: 0,
    contactId: 'contact-1',
    contact: { id: 'contact-1', name: 'John', email: 'john@test.com', phone: '+1234567890' },
  };

  beforeEach(async () => {
    prisma = {
      lead: {
        findMany: jest.fn().mockResolvedValue([mockLead]),
        findUnique: jest.fn().mockResolvedValue(mockLead),
        create: jest.fn().mockResolvedValue(mockLead),
        update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ ...mockLead, ...data })),
        count: jest.fn().mockResolvedValue(1),
      },
      scoringRule: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      scoreLog: {
        create: jest.fn().mockResolvedValue({}),
      },
      $transaction: jest.fn().mockImplementation((cb: any) => cb(prisma)),
    };

    const module = await Test.createTestingModule({
      providers: [
        LeadsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditLogsService, useValue: auditLogs },
        { provide: AdvancedFeaturesService, useValue: advanced },
        { provide: EventsService, useValue: events },
        { provide: NotificationsService, useValue: notifications },
      ],
    }).compile();

    service = module.get<LeadsService>(LeadsService);
  });

  it('should create a lead', async () => {
    const lead = await service.create({ contactId: 'contact-1', source: 'FORM' });
    expect(lead.status).toBe('NEW');
    expect(lead.source).toBe('FORM');
  });

  it('should find leads with pagination', async () => {
    const result = await service.findAll({ page: 1, limit: 10 });
    expect(result.data).toHaveLength(1);
    expect(result.meta.total).toBe(1);
  });

  it('should find lead by id', async () => {
    const lead = await service.findOne('lead-1');
    expect(lead.contact.name).toBe('John');
  });

  it('should throw on non-existent lead', async () => {
    prisma.lead.findUnique.mockResolvedValue(null);
    await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
  });

  it('should score a lead', async () => {
    const scored = await service.score('lead-1');
    expect(scored.score).toBe(0);
    expect(scored.segment).toBe('UNQUALIFIED');
  });

  it('should mark lead as spam', async () => {
    const spam = await service.markSpam('lead-1');
    expect(spam.status).toBe('SPAM');
    expect(spam.segment).toBe('UNQUALIFIED');
    expect(spam.score).toBe(-100);
  });
});
