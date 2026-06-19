import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { OutboxService } from './outbox.service';
import { PrismaService } from '../prisma/prisma.service';
import { TwilioSmsAdapter } from './adapters/sms.adapter';
import { WhatsAppCloudAdapter } from './adapters/messaging.adapter';

describe('OutboxService', () => {
  let service: OutboxService;
  let prisma: any;
  let smsAdapter: any;

  beforeEach(async () => {
    prisma = {
      outboxMessage: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
    };

    smsAdapter = {
      send: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OutboxService,
        { provide: PrismaService, useValue: prisma },
        { provide: TwilioSmsAdapter, useValue: smsAdapter },
        { provide: WhatsAppCloudAdapter, useValue: { sendMessage: jest.fn() } },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('test') } },
      ],
    }).compile();

    service = module.get<OutboxService>(OutboxService);
  });

  it('should enqueue a message and return the id', async () => {
    prisma.outboxMessage.findUnique.mockResolvedValue(null);
    prisma.outboxMessage.create.mockResolvedValue({ id: 'out-1' });

    const id = await service.enqueue({
      channel: 'SMS',
      recipient: '+15551234567',
      text: 'Hello!',
      leadId: 'lead-1',
    });

    expect(id).toBe('out-1');
  });

  it('should deduplicate identical messages (same idempotency key)', async () => {
    prisma.outboxMessage.findUnique.mockResolvedValue({ id: 'existing-id' });

    const id = await service.enqueue({
      channel: 'SMS',
      recipient: '+15551234567',
      text: 'Hello!',
      leadId: 'lead-1',
    });

    expect(id).toBe('existing-id');
    expect(prisma.outboxMessage.create).not.toHaveBeenCalled();
  });

  it('should mark message as delivered after successful send', async () => {
    prisma.outboxMessage.findMany.mockResolvedValue([
      { id: 'out-2', channel: 'SMS', recipient: '+15551234567', text: 'Hi!', attempts: 0, maxAttempts: 3, lockedAt: null },
    ]);
    prisma.outboxMessage.updateMany.mockResolvedValue({ count: 1 });
    smsAdapter.send.mockResolvedValue({ success: true, providerMessageId: 'msg-123' });
    prisma.outboxMessage.update.mockResolvedValue({});

    const processed = await service.drain(10);
    expect(processed).toBe(1);
    expect(prisma.outboxMessage.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'delivered' }) }),
    );
  });

  it('should leave retryable row when external send fails', async () => {
    prisma.outboxMessage.findMany.mockResolvedValue([
      { id: 'out-3', channel: 'SMS', recipient: '+15551234567', text: 'Hi!', attempts: 1, maxAttempts: 3, lockedAt: null },
    ]);
    prisma.outboxMessage.updateMany.mockResolvedValue({ count: 1 });
    smsAdapter.send.mockResolvedValue({ success: false, error: 'Send failed' });
    prisma.outboxMessage.update.mockResolvedValue({});

    const processed = await service.drain(10);
    expect(processed).toBe(1);
    expect(prisma.outboxMessage.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'pending', lastError: 'Send failed' }) }),
    );
  });

  it('should not double-send on re-drain (idempotency key prevents re-enqueue)', async () => {
    prisma.outboxMessage.findUnique.mockResolvedValue({ id: 'out-4' });

    const id = await service.enqueue({
      channel: 'SMS',
      recipient: '+15551234567',
      text: 'Hello!',
      leadId: 'lead-1',
    });

    expect(id).toBe('out-4');
    expect(prisma.outboxMessage.create).not.toHaveBeenCalled();
  });
});
