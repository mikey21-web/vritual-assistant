import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TwilioSmsAdapter } from './adapters/sms.adapter';
import { WhatsAppCloudAdapter, TelegramBotAdapter } from './adapters/messaging.adapter';
import { CircuitBreaker } from './circuit-breaker';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class OutboxService {
  private readonly logger = new Logger(OutboxService.name);
  private readonly smsBreaker: CircuitBreaker;
  private readonly waBreaker: CircuitBreaker;
  private readonly tgBreaker: CircuitBreaker;

  constructor(
    private prisma: PrismaService,
    private smsAdapter: TwilioSmsAdapter,
    private whatsAppAdapter: WhatsAppCloudAdapter,
    private telegramAdapter: TelegramBotAdapter,
    private config: ConfigService,
  ) {
    this.smsBreaker = new CircuitBreaker('outbox-sms', 5, 30000);
    this.waBreaker = new CircuitBreaker('outbox-whatsapp', 5, 30000);
    this.tgBreaker = new CircuitBreaker('outbox-telegram', 5, 30000);
  }

  /**
   * Write a message intent to the outbox in the same transaction as the DB state change.
   */
  async enqueue(dto: {
    channel: string;
    recipient: string;
    text: string;
    leadId?: string;
    contactId?: string;
    conversationMessageId?: string;
  }): Promise<string> {
    const idempotencyKey = crypto.createHash('sha256').update(`${dto.channel}:${dto.recipient}:${dto.text}:${dto.leadId || ''}`).digest('hex').slice(0, 32);

    const existing = await this.prisma.outboxMessage.findUnique({ where: { idempotencyKey } });
    if (existing) {
      this.logger.warn(`Outbox duplicate suppressed: ${idempotencyKey}`);
      return existing.id;
    }

    const msg = await this.prisma.outboxMessage.create({
      data: { ...dto, idempotencyKey, status: 'pending' },
    });
    return msg.id;
  }

  /**
   * Drain pending outbox messages — called by a worker/cron.
   * Processes up to `batchSize` messages at a time with atomic claim.
   */
  async drain(batchSize: number = 10): Promise<number> {
    const pending = await this.prisma.outboxMessage.findMany({
      where: {
        status: 'pending',
        attempts: { lt: 3 }, // maxAttempts hardcoded check
        OR: [
          { lockedAt: null },
          { lockedAt: { lt: new Date(Date.now() - 60000) } }, // stale lock after 1 min
        ],
      },
      take: batchSize,
      orderBy: { scheduledAt: 'asc' },
    });

    let processed = 0;
    for (const msg of pending) {
      // Atomic claim
      const claimed = await this.prisma.outboxMessage.updateMany({
        where: { id: msg.id, lockedAt: null },
        data: { lockedAt: new Date(), attempts: { increment: 1 } },
      });
      if (claimed.count === 0) continue; // another worker claimed it

      try {
        const channel = msg.channel.toUpperCase();
        let result: { success: boolean; providerMessageId?: string; error?: string };

        if (channel === 'SMS') {
          result = await this.smsBreaker.call(() => this.smsAdapter.send(msg.recipient, msg.text));
        } else if (channel === 'WHATSAPP') {
          const config = {
            phoneNumberId: this.config.get<string>('WHATSAPP_PHONE_NUMBER_ID') || '',
            accessToken: this.config.get<string>('WHATSAPP_ACCESS_TOKEN') || '',
          };
          result = await this.waBreaker.call(() => this.whatsAppAdapter.sendMessage(msg.recipient, msg.text, config));
        } else if (channel === 'TELEGRAM') {
          result = await this.tgBreaker.call(() =>
            this.telegramAdapter.sendMessage(msg.recipient, msg.text, {
              botToken: this.config.get<string>('TELEGRAM_BOT_TOKEN'),
            }),
            () => Promise.resolve({ success: false, error: 'Telegram circuit open' })
          );
        } else {
          result = { success: false, error: `Unsupported channel: ${channel}` };
        }

        if (result.success) {
          await this.prisma.outboxMessage.update({
            where: { id: msg.id },
            data: { status: 'delivered', deliveredAt: new Date(), lockedAt: null, lastError: null },
          });
        } else {
          await this.prisma.outboxMessage.update({
            where: { id: msg.id },
            data: { status: msg.attempts >= msg.maxAttempts ? 'failed' : 'pending', lockedAt: null, lastError: result.error || 'Unknown error' },
          });
        }

        processed++;
      } catch (err: any) {
        this.logger.error(`Outbox drain error for ${msg.id}: ${err.message}`);
        await this.prisma.outboxMessage.update({
          where: { id: msg.id },
          data: { lockedAt: null, lastError: err.message },
        });
      }
    }

    return processed;
  }

  /**
   * Re-drain failed messages that haven't exceeded max attempts.
   */
  async retryFailed(): Promise<number> {
    const failed = await this.prisma.outboxMessage.updateMany({
      where: { status: 'failed', attempts: { lt: 3 } },
      data: { status: 'pending', lockedAt: null, lastError: null },
    });
    return failed.count;
  }
}
