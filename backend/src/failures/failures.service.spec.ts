import { Test, TestingModule } from '@nestjs/testing';
import { FailuresService } from './failures.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import { AlertingService } from '../monitoring/alerting.service';

describe('FailuresService', () => {
  let service: FailuresService;
  let prisma: any;
  let retryQueue: any;
  let alerting: any;

  const mockFailure = {
    id: 'failure-1',
    type: 'WHATSAPP_SEND',
    severity: 'high',
    message: 'Failed to send WhatsApp message',
    leadId: 'lead-1',
    contactId: 'contact-1',
    entityType: 'Lead',
    entityId: 'lead-1',
    provider: 'whatsapp',
    operation: 'sendMessage',
    errorCode: 'ERR_AUTH',
    rawError: { status: 401 },
    retryable: true,
    status: 'open',
    attempts: 0,
    maxAttempts: 3,
    nextRetryAt: null,
    resolvedAt: null,
    resolvedById: null,
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z'),
  };

  beforeEach(async () => {
    prisma = {
      failureRecord: {
        create: jest.fn().mockResolvedValue(mockFailure),
        findMany: jest.fn().mockResolvedValue([mockFailure]),
        findUnique: jest.fn().mockResolvedValue(mockFailure),
        update: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({ ...mockFailure, ...data }),
        ),
      },
    };

    retryQueue = {
      add: jest.fn().mockResolvedValue({ id: 'job-1' }),
    };
    alerting = { notifyOnFailure: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FailuresService,
        { provide: PrismaService, useValue: prisma },
        { provide: getQueueToken('failure-retry'), useValue: retryQueue },
        { provide: AlertingService, useValue: alerting },
      ],
    }).compile();

    service = module.get<FailuresService>(FailuresService);
  });

  // ── record ──────────────────────────────────────

  it('should record a failure', async () => {
    const failure = await service.record({
      type: 'WHATSAPP_SEND',
      severity: 'high',
      message: 'Failed to send WhatsApp message',
      leadId: 'lead-1',
      provider: 'whatsapp',
      operation: 'sendMessage',
    });
    expect(failure.type).toBe('WHATSAPP_SEND');
    expect(failure.severity).toBe('high');
    expect(failure.message).toBe('Failed to send WhatsApp message');
  });

  it('should default severity to "medium" when not provided', async () => {
    prisma.failureRecord.create.mockResolvedValue({ ...mockFailure, severity: 'medium' });
    const failure = await service.record({
      type: 'EMAIL_SEND',
      message: 'Email failed',
    });
    expect(failure.severity).toBe('medium');
    expect(prisma.failureRecord.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ severity: 'medium', retryable: true }),
      }),
    );
  });

  it('should default retryable to true when not provided', async () => {
    await service.record({ type: 'API_CALL', message: 'API failed' });
    expect(prisma.failureRecord.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ retryable: true }),
      }),
    );
  });

  it('should allow setting retryable to false', async () => {
    await service.record({ type: 'VALIDATION', message: 'Bad data', retryable: false });
    expect(prisma.failureRecord.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ retryable: false }),
      }),
    );
  });

  it('should store rawError when provided', async () => {
    const rawError = { status: 500, body: 'Internal error' };
    await service.record({ type: 'API', message: 'Server error', rawError });
    expect(prisma.failureRecord.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ rawError }),
      }),
    );
  });

  it('should record a failure with optional contactId and errorCode', async () => {
    const failure = await service.record({
      type: 'CRM_SYNC',
      message: 'CRM sync failure',
      contactId: 'contact-2',
      errorCode: 'ERR_SYNC',
    });
    expect(failure.contactId).toBe('contact-1');
    expect(failure.errorCode).toBe('ERR_AUTH');
  });

  // ── getInbox ────────────────────────────────────

  it('should get inbox without filters', async () => {
    const failures = await service.getInbox();
    expect(failures).toHaveLength(1);
    expect(prisma.failureRecord.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {},
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    );
  });

  it('should filter inbox by status', async () => {
    await service.getInbox({ status: 'open' });
    expect(prisma.failureRecord.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: 'open' },
      }),
    );
  });

  it('should filter inbox by type', async () => {
    await service.getInbox({ type: 'WHATSAPP_SEND' });
    expect(prisma.failureRecord.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { type: 'WHATSAPP_SEND' },
      }),
    );
  });

  it('should filter inbox by leadId', async () => {
    await service.getInbox({ leadId: 'lead-1' });
    expect(prisma.failureRecord.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { leadId: 'lead-1' },
      }),
    );
  });

  it('should combine multiple filters', async () => {
    await service.getInbox({ status: 'open', type: 'EMAIL_SEND', leadId: 'lead-2' });
    expect(prisma.failureRecord.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: 'open', type: 'EMAIL_SEND', leadId: 'lead-2' },
      }),
    );
  });

  it('should return empty array when no failures match', async () => {
    prisma.failureRecord.findMany.mockResolvedValue([]);
    const result = await service.getInbox({ status: 'resolved' });
    expect(result).toEqual([]);
  });

  // ── retry ───────────────────────────────────────

  it('should retry a failure by enqueuing to the retry queue', async () => {
    const result = await service.retry('failure-1');
    expect(retryQueue.add).toHaveBeenCalledWith(
      'retry-failure',
      { failureId: 'failure-1' },
      { delay: 5000, attempts: 1 },
    );
    expect(result.status).toBe('retrying');
    expect(result.attempts).toBe(1);
  });

  it('should throw NotFoundException when retrying non-existent failure', async () => {
    prisma.failureRecord.findUnique.mockResolvedValue(null);
    await expect(service.retry('nonexistent')).rejects.toThrow(NotFoundException);
  });

  it('should throw BadRequestException when failure is not retryable', async () => {
    prisma.failureRecord.findUnique.mockResolvedValue({ ...mockFailure, retryable: false });
    await expect(service.retry('failure-1')).rejects.toThrow(BadRequestException);
    await expect(service.retry('failure-1')).rejects.toThrow('not retryable');
  });

  it('should throw BadRequestException when failure is already resolved', async () => {
    prisma.failureRecord.findUnique.mockResolvedValue({ ...mockFailure, status: 'resolved' });
    await expect(service.retry('failure-1')).rejects.toThrow(BadRequestException);
    await expect(service.retry('failure-1')).rejects.toThrow('Already resolved');
  });

  it('should throw BadRequestException when max retry attempts reached', async () => {
    prisma.failureRecord.findUnique.mockResolvedValue({ ...mockFailure, attempts: 3, maxAttempts: 3 });
    await expect(service.retry('failure-1')).rejects.toThrow(BadRequestException);
    await expect(service.retry('failure-1')).rejects.toThrow('Max retry attempts reached');
  });

  it('should update nextRetryAt when retrying', async () => {
    const before = Date.now();
    const result = await service.retry('failure-1');
    expect(result.nextRetryAt!.getTime()).toBeGreaterThanOrEqual(before + 29000);
    expect(prisma.failureRecord.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'failure-1' },
        data: expect.objectContaining({
          status: 'retrying',
          attempts: 1,
        }),
      }),
    );
  });

  it('should not enqueue job when retry throws before queue add', async () => {
    prisma.failureRecord.findUnique.mockResolvedValue(null);
    await expect(service.retry('nonexistent')).rejects.toThrow(NotFoundException);
    expect(retryQueue.add).not.toHaveBeenCalled();
  });

  // ── resolve ─────────────────────────────────────

  it('should resolve a failure manually', async () => {
    const result = await service.resolve('failure-1');
    expect(result.status).toBe('resolved');
    expect(result.resolvedAt).toBeDefined();
  });

  it('should resolve a failure with resolvedById', async () => {
    const result = await service.resolve('failure-1', 'user-admin');
    expect(prisma.failureRecord.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'failure-1' },
        data: expect.objectContaining({ status: 'resolved', resolvedById: 'user-admin' }),
      }),
    );
  });

  it('should throw NotFoundException when resolving non-existent failure', async () => {
    prisma.failureRecord.findUnique.mockResolvedValue(null);
    await expect(service.resolve('nonexistent')).rejects.toThrow(NotFoundException);
  });

  it('should set resolvedAt date when resolving', async () => {
    const before = Date.now();
    await service.resolve('failure-1');
    expect(prisma.failureRecord.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          resolvedAt: expect.any(Date),
        }),
      }),
    );
  });
});

