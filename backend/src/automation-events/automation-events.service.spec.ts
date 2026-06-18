import { Test, TestingModule } from '@nestjs/testing';
import { AutomationEventsService } from './automation-events.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { getQueueToken } from '@nestjs/bullmq';

describe('AutomationEventsService', () => {
  let service: AutomationEventsService;
  let prisma: any;
  const auditLogs = { log: jest.fn().mockResolvedValue({}) };
  const retryQueue = { add: jest.fn().mockResolvedValue({}) };

  const mockEvent = {
    id: 'evt-1',
    type: 'LEAD_CREATED',
    status: 'failed',
    attempts: 2,
    maxAttempts: 5,
    payload: {},
    lastError: 'Network error',
  };

  beforeEach(async () => {
    prisma = {
      automationEvent: {
        findMany: jest.fn().mockResolvedValue([mockEvent]),
        create: jest.fn().mockResolvedValue(mockEvent),
        findUnique: jest.fn().mockResolvedValue(mockEvent),
        update: jest.fn().mockResolvedValue({ ...mockEvent, status: 'pending', attempts: 3 }),
        count: jest.fn().mockResolvedValue(1),
      },
    };
    const module = await Test.createTestingModule({
      providers: [
        AutomationEventsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditLogsService, useValue: auditLogs },
        { provide: getQueueToken('automation-retry'), useValue: retryQueue },
      ],
    }).compile();
    service = module.get<AutomationEventsService>(AutomationEventsService);
  });

  it('should retry a failed event', async () => {
    const result = await service.retry('evt-1');
    expect(result.status).toBe('pending');
    expect(result.attempts).toBe(3);
  });

  it('should reject retry when max attempts reached', async () => {
    prisma.automationEvent.findUnique.mockResolvedValue({ ...mockEvent, attempts: 5 });
    await expect(service.retry('evt-1')).rejects.toThrow();
  });

  it('should create an event', async () => {
    const result = await service.create({ type: 'LEAD_CREATED', payload: { leadId: '1' } });
    expect(result.type).toBe('LEAD_CREATED');
  });
});
