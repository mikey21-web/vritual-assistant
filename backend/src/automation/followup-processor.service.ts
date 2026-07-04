import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppCloudAdapter, TelegramBotAdapter, MessagingAdapter } from '../shared/adapters/messaging.adapter';
import { EmailAdapter } from '../shared/adapters/email.adapter';
import { ConversationsService } from '../conversations/conversations.service';

const FOLLOWUP_KINDS = ['followup', 're_engage', 'send_retry'] as const;
type FollowupKind = (typeof FOLLOWUP_KINDS)[number];

@Injectable()
@Processor('followup')
export class FollowupProcessorService extends WorkerHost implements OnApplicationBootstrap {
  private readonly logger = new Logger(FollowupProcessorService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private whatsAppAdapter: WhatsAppCloudAdapter,
    private telegramAdapter: TelegramBotAdapter,
    private emailAdapter: EmailAdapter,
    private conversationsService: ConversationsService,
    @InjectQueue('followup') private queue: Queue,
  ) {
    super();
  }

  async onApplicationBootstrap() {
    // Register a recurring poll job every 20 seconds
    const jobId = 'followup-poll';
    const exists = await this.queue.getJob(jobId).catch(() => null);
    if (!exists) {
      await this.queue.add(
        'followup-poll',
        { type: 'poll' },
        {
          jobId,
          repeat: { every: 20_000 },
          removeOnComplete: true,
          removeOnFail: false,
          attempts: 1,
        },
      );
      this.logger.log('Follow-up poll job registered (every 20s)');
    }
  }

  async process(job: Job<{ type: string }>): Promise<any> {
    if (job.data.type === 'poll') {
      return this.pollAndProcess();
    }
    return { processed: false, reason: 'unknown_job_type' };
  }

  private async pollAndProcess(): Promise<{ processed: number }> {
    const records = await this.prisma.scheduledAction.findMany({
      where: {
        kind: { in: FOLLOWUP_KINDS as unknown as string[] },
        status: 'pending',
        runAt: { lte: new Date() },
      },
      take: 20,
      orderBy: { runAt: 'asc' },
    });

    if (records.length === 0) return { processed: 0 };

    let processedCount = 0;

    for (const record of records) {
      // Atomic claim — only process if still pending
      const claim = await this.prisma.scheduledAction.updateMany({
        where: { id: record.id, status: 'pending' },
        data: { status: 'claimed', attempts: { increment: 1 } },
      });

      if (claim.count === 0) continue;

      try {
        const success = await this.processFollowup(record);
        await this.prisma.scheduledAction.update({
          where: { id: record.id },
          data: { status: success ? 'done' : 'failed' },
        });
        if (success) processedCount++;
      } catch (e: any) {
        this.logger.error(`Follow-up ${record.id} failed: ${e.message}`, e.stack);
        await this.prisma.scheduledAction.update({
          where: { id: record.id },
          data: { status: 'failed' },
        });
      }
    }

    this.logger.debug(`Follow-up poll: processed ${processedCount}/${records.length} records`);
    return { processed: processedCount };
  }

  private async processFollowup(record: any): Promise<boolean> {
    const { leadId, kind, payload } = record;

    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
      include: { contact: true },
    });

    if (!lead) {
      this.logger.warn(`Follow-up lead ${leadId} not found — marking failed`);
      return false;
    }

    switch (kind as FollowupKind) {
      case 'followup':
        return this.handleFollowup(lead, payload);
      case 're_engage':
        return this.handleReEngage(lead, payload);
      case 'send_retry':
        return this.handleSendRetry(lead, payload);
      default:
        this.logger.warn(`Unknown followup kind: ${kind}`);
        return false;
    }
  }

  // ── followup ────────────────────────────────────

  private async handleFollowup(lead: any, payload: any): Promise<boolean> {
    const contact = lead.contact;
    if (!contact) return false;

    const channel = this.resolvePreferredChannel(lead, payload);
    const text = payload.text || 'We wanted to follow up with you. Let us know if you have any questions!';

    const success = await this.dispatchMessage(lead, channel, text, payload);
    if (success) {
      this.logger.log(`Follow-up sent to lead ${lead.id} via ${channel}`);
    }
    return success;
  }

  // ── re_engage ───────────────────────────────────

  private async handleReEngage(lead: any, payload: any): Promise<boolean> {
    const contact = lead.contact;
    if (!contact) return false;

    // Check if lead is cold and not contacted recently
    const segment = (lead.segment || '').toUpperCase();
    const lastContacted = await this.getLastContactedDate(lead.id);

    if (segment !== 'COLD') {
      this.logger.debug(`Lead ${lead.id} segment is ${segment}, not COLD — skipping re-engagement`);
      return false;
    }

    if (lastContacted && this.daysSince(lastContacted) < 7) {
      this.logger.debug(
        `Lead ${lead.id} last contacted ${this.daysSince(lastContacted)}d ago — skipping (needs 7+ days)`,
      );
      return false;
    }

    const channel = this.resolvePreferredChannel(lead, payload);
    const text =
      payload.text ||
      "Hi! We haven't heard from you in a while. We'd love to reconnect and see if we can help you.";

    const success = await this.dispatchMessage(lead, channel, text, payload);
    if (success) {
      this.logger.log(`Re-engagement sent to lead ${lead.id} via ${channel}`);
    }
    return success;
  }

  // ── send_retry ──────────────────────────────────

  private async handleSendRetry(lead: any, payload: any): Promise<boolean> {
    const contact = lead.contact;
    if (!contact) return false;

    const channel = (payload.channel || 'WHATSAPP').toUpperCase();
    const text = payload.text || '';
    if (!text) {
      this.logger.warn(`send_retry for lead ${lead.id} has no text payload`);
      return false;
    }

    const success = await this.dispatchMessage(lead, channel, text, payload);
    if (success) {
      this.logger.log(`Retry send succeeded for lead ${lead.id} via ${channel}`);
    }
    return success;
  }

  // ── Dispatch helpers ────────────────────────────

  private async dispatchMessage(
    lead: any,
    channel: string,
    text: string,
    payload: any,
  ): Promise<boolean> {
    const contact = lead.contact;
    if (!contact) return false;

    // Record the outbound message via ConversationsService
    try {
      await this.conversationsService.create({
        text,
        channel,
        direction: 'OUTBOUND',
        leadId: lead.id,
        contactId: contact.id,
        messageTemplateId: payload.templateId || null,
      });
    } catch (e: any) {
      this.logger.warn(`Message blocked by policy for lead ${lead.id}: ${e.message}`);
      return false;
    }

    // Send via the appropriate adapter
    switch (channel) {
      case 'WHATSAPP': {
        const to = contact.whatsapp || contact.phone;
        if (!to) return false;
        const waConfig = {
          phoneNumberId: this.config.get<string>('WHATSAPP_PHONE_NUMBER_ID') || '',
          accessToken: this.config.get<string>('WHATSAPP_ACCESS_TOKEN') || '',
        };
        const result = await this.whatsAppAdapter.sendMessage(to, text, waConfig);
        return result.success;
      }

      case 'TELEGRAM': {
        const chatId = contact.whatsapp || contact.phone;
        if (!chatId) return false;
        const result = await this.telegramAdapter.sendMessage(chatId, text, {
          botToken: this.config.get<string>('TELEGRAM_BOT_TOKEN'),
        });
        return result.success;
      }

      case 'EMAIL': {
        const to = contact.email;
        if (!to) return false;
        const subject = payload.subject || 'Follow-up';
        const html = `<p>${text}</p>`;
        const result = await this.emailAdapter.send(to, subject, html);
        return result.success;
      }

      default:
        this.logger.warn(`Unknown channel for dispatch: ${channel}`);
        return false;
    }
  }

  private resolvePreferredChannel(lead: any, payload: any): string {
    // Priority: payload > contact preference > default
    if (payload.channel) return payload.channel.toUpperCase();
    if (lead.contact?.preferredChannel) return lead.contact.preferredChannel.toUpperCase();
    // If the contact has a WhatsApp number, default to WhatsApp
    if (lead.contact?.whatsapp || lead.contact?.phone) return 'WHATSAPP';
    if (lead.contact?.email) return 'EMAIL';
    return 'WHATSAPP';
  }

  private async getLastContactedDate(leadId: string): Promise<Date | null> {
    const lastMsg = await this.prisma.conversationMessage.findFirst({
      where: { leadId, direction: 'OUTBOUND', deliveryStatus: 'delivered' },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });
    return lastMsg?.createdAt || null;
  }

  private daysSince(date: Date): number {
    return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
  }
}
