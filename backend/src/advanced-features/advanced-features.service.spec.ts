import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AdvancedFeaturesService } from './advanced-features.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

describe('AdvancedFeaturesService — blocklist & SLA', () => {
  let service: AdvancedFeaturesService;
  let prisma: any;
  const auditLogs = { log: jest.fn().mockResolvedValue({}) };

  const mockBlockEntry = { id: 'bl-1', type: 'email', value: 'spam@test.com', reason: 'Known spam' };
  const mockSlaRule = { id: 'sla-1', name: 'Urgent Response', condition: { status: 'NEW' }, responseTimeMinutes: 60, escalationAfterMinutes: 120, escalationUserId: 'user-1', active: true };

  beforeEach(async () => {
    prisma = {
      blocklistEntry: {
        findMany: jest.fn().mockResolvedValue([mockBlockEntry]),
        findUnique: jest.fn().mockResolvedValue(mockBlockEntry),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(d => d.data || d),
        delete: jest.fn().mockResolvedValue({}),
      },
      slaRule: {
        findMany: jest.fn().mockResolvedValue([mockSlaRule]),
        findUnique: jest.fn().mockResolvedValue(mockSlaRule),
        create: jest.fn().mockResolvedValue(mockSlaRule),
        update: jest.fn().mockResolvedValue(mockSlaRule),
        delete: jest.fn().mockResolvedValue({}),
      },
      lead: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      pipelineStage: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      savedFilter: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
        delete: jest.fn(),
      },
      internalNote: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
      },
      notificationPreference: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(d => d),
        upsert: jest.fn().mockImplementation(({ create }) => create),
      },
      leadOwnershipHistory: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
      },
      contact: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        delete: jest.fn(),
      },
      lead_count: { updateMany: jest.fn() },
      revenueRecord: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
        aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 0 } }),
      },
      importExportLog: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      automationEvent: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      conversationMessage: { updateMany: jest.fn() },
      mediaFile: { updateMany: jest.fn() },
      customFieldValue: { updateMany: jest.fn() },
      $queryRaw: jest.fn().mockResolvedValue([{ 1: 1 }]),
      $transaction: jest.fn(cb => cb()),
    };

    const module = await Test.createTestingModule({
      providers: [
        AdvancedFeaturesService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditLogsService, useValue: auditLogs },
      ],
    }).compile();
    service = module.get<AdvancedFeaturesService>(AdvancedFeaturesService);
  });

  describe('blocklist', () => {
    it('should detect blocked email', async () => {
      prisma.blocklistEntry.findFirst.mockResolvedValue(mockBlockEntry);
      const blocked = await service.checkBlocklist('spam@test.com');
      expect(blocked).toBe(true);
    });

    it('should allow clean email', async () => {
      prisma.blocklistEntry.findFirst.mockResolvedValue(null);
      const blocked = await service.checkBlocklist('clean@test.com');
      expect(blocked).toBe(false);
    });

    it('should detect blocked phone', async () => {
      prisma.blocklistEntry.findFirst.mockResolvedValue({ ...mockBlockEntry, type: 'phone', value: '1234567890' });
      const blocked = await service.checkBlocklist(undefined, '1234567890');
      expect(blocked).toBe(true);
    });

    it('should add to blocklist', async () => {
      const result = await service.addToBlocklist('email', 'bad@test.com', 'Spam');
      expect(result.type).toBe('email');
      expect(result.value).toBe('bad@test.com');
    });
  });

  describe('SLA rules', () => {
    it('should evaluate SLA rules and find breaches', async () => {
      prisma.lead.findMany.mockResolvedValue([
        { id: 'lead-1', createdAt: new Date(Date.now() - 120 * 60000), contact: { name: 'Test', email: 'test@test.com' }, conversations: [] },
      ]);
      const result = await service.evaluateSlaRules();
      expect(result.breaches.length).toBe(1);
      expect(result.breaches[0].breached).toBe(true);
    });

    it('should return empty when no leads breach SLA', async () => {
      prisma.lead.findMany.mockResolvedValue([]);
      const result = await service.evaluateSlaRules();
      expect(result.breaches.length).toBe(0);
    });
  });

  describe('failure inbox', () => {
    it('should list failed events', async () => {
      prisma.automationEvent.findMany.mockResolvedValue([
        { id: 'ev-1', type: 'CRM_PUSH_REQUESTED', status: 'failed', payload: {}, attempts: 3, lastError: 'network error' },
      ]);
      const inbox = await service.getFailureInbox();
      expect(inbox.length).toBe(1);
      expect(inbox[0].status).toBe('failed');
    });

    it('should retry a failed event', async () => {
      prisma.automationEvent.findUnique.mockResolvedValue({
        id: 'ev-1', type: 'CRM_PUSH_REQUESTED', status: 'failed', attempts: 2, maxAttempts: 5,
      });
      const result = await service.retryFailedEvent('ev-1');
      expect(result.status).toBe('retrying');
    });
  });

  describe('sandbox test', () => {
    it('should run sandbox test', async () => {
      const result = await service.sandboxTest();
      expect(result.checks.database).toBe('ok');
    });
  });
});
