import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppCloudAdapter, TelegramBotAdapter, MessagingAdapter } from '../shared/adapters/messaging.adapter';
import { EmailAdapter } from '../shared/adapters/email.adapter';
import { ConversationsService } from '../conversations/conversations.service';

const FOLLOWUP_KINDS = ['followup', 're_engage', 'send_retry', 'site_visit_reminder', 'post_visit_followup', 'payment_reminder', 'notification', 'cost_sheet_followup', 'cost_sheet_followup_2', 'cost_sheet_escalation', 'no_show_recovery', 'booking_token_reminder', 'booking_hold_warning', 'payment_escalation'] as const;
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
      case 'site_visit_reminder':
      case 'post_visit_followup':
      case 'payment_reminder':
      case 'notification':
      case 'booking_token_reminder':
      case 'booking_hold_warning':
        // Booking/payment lifecycle messages arrive with fully-rendered text in the
        // payload; just dispatch it on the requested channel.
        return this.handleBookingMessage(lead, payload);
      case 'cost_sheet_followup':
      case 'cost_sheet_followup_2':
        return this.handleCostSheetFollowup(lead, payload);
      case 'cost_sheet_escalation':
        return this.handleCostSheetEscalation(lead, payload);
      case 'no_show_recovery':
        return this.handleNoShowRecovery(lead, payload);
      case 'payment_escalation':
        return this.handlePaymentEscalation(lead, payload);
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

  // ── booking lifecycle (site-visit reminders / post-visit follow-ups) ──

  private async handleBookingMessage(lead: any, payload: any): Promise<boolean> {
    if (!lead.contact) return false;
    const text = payload.text;
    if (!text) {
      this.logger.warn(`Booking lifecycle message for lead ${lead.id} has no text payload`);
      return false;
    }
    const channel = this.resolvePreferredChannel(lead, payload);
    const success = await this.dispatchMessage(lead, channel, text, payload);
    if (success) {
      this.logger.log(`Booking lifecycle message sent to lead ${lead.id} via ${channel}`);
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

  // ── cost_sheet_followup / cost_sheet_followup_2 ──

  private async handleCostSheetFollowup(lead: any, payload: any): Promise<boolean> {
    const contact = lead.contact;
    if (!contact) return false;
    const name = contact.name?.split(/\s+/)[0] || 'there';
    const channel = this.resolvePreferredChannel(lead, payload);
    const text = payload.text || `Hi ${name}, just checking in on the cost sheet we shared. Do you have any questions about the pricing or payment terms? Happy to walk through it.`;
    const success = await this.dispatchMessage(lead, channel, text, payload);
    if (success) this.logger.log(`Cost sheet follow-up sent to lead ${lead.id}`);
    return success;
  }

  // ── cost_sheet_escalation ────────────────────────

  private async handleCostSheetEscalation(lead: any, payload: any): Promise<boolean> {
    const contact = lead.contact;
    const name = contact?.name?.split(/\s+/)[0] || lead.id;
    const assigneeId = lead.assignedAgentId || payload.agentId;
    if (assigneeId) {
      try {
        await this.prisma.task.create({
          data: {
            title: `Escalation: Cost sheet follow-up required for ${name}`,
            description: payload.text || 'Cost sheet has been pending for 7+ days — needs immediate follow-up.',
            priority: 'high',
            leadId: lead.id,
            assigneeId,
            dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            createdBy: 'system',
            source: 'cost_sheet_escalation',
          },
        });
        this.logger.log(`Cost sheet escalation task created for lead ${lead.id}`);
      } catch (e: any) {
        this.logger.warn(`Failed to create cost sheet escalation task: ${e.message}`);
        return false;
      }
    }
    return true;
  }

  // ── no_show_recovery ─────────────────────────────

  private async handleNoShowRecovery(lead: any, payload: any): Promise<boolean> {
    const contact = lead.contact;
    if (!contact) return false;
    const name = contact.name?.split(/\s+/)[0] || 'there';
    const step = payload.step;

    if (step === 'escalate_to_manager') {
      const assigneeId = lead.assignedAgentId || payload.agentId;
      if (assigneeId) {
        try {
          await this.prisma.task.create({
            data: {
              title: `Escalation: No-show recovery for ${name}`,
              description: 'Lead did not respond to no-show recovery messages within 72h — needs manager follow-up.',
              priority: 'high',
              leadId: lead.id,
              assigneeId,
              dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
              createdBy: 'system',
              source: 'no_show_escalation',
            },
          });
          this.logger.log(`No-show escalation task created for lead ${lead.id}`);
        } catch (e: any) {
          this.logger.warn(`Failed to create no-show escalation task: ${e.message}`);
          return false;
        }
      }
      return true;
    }

    const text = step === 'we_missed_you'
      ? `Hi ${name}, we missed you at your scheduled visit. No worries at all! We'd love to reschedule at a time that works better for you.`
      : `Hi ${name}, we have availability this week. Would any slots work for you? Let us know and we'll get you booked in.`;
    const channel = this.resolvePreferredChannel(lead, payload);
    const success = await this.dispatchMessage(lead, channel, text, payload);
    if (success) this.logger.log(`No-show recovery (${step}) sent to lead ${lead.id}`);
    return success;
  }

  // ── payment_escalation ───────────────────────────

  private async handlePaymentEscalation(lead: any, payload: any): Promise<boolean> {
    const contact = lead.contact;
    const stage = payload.stage;
    const name = contact?.name?.split(/\s+/)[0] || lead.id;

    if (stage === 'agent_task') {
      const assigneeId = lead.assignedAgentId || payload.agentId;
      if (assigneeId) {
        try {
          await this.prisma.task.create({
            data: {
              title: `Payment follow-up required for ${name}`,
              description: payload.text || `${payload.label || 'Payment'} of ${payload.amount || ''} ${payload.currency || 'INR'} is overdue — agent follow-up needed.`,
              priority: 'high',
              leadId: lead.id,
              assigneeId,
              dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
              createdBy: 'system',
              source: 'payment_escalation_task',
            },
          });
          this.logger.log(`Payment escalation task created for lead ${lead.id}`);
        } catch (e: any) {
          this.logger.warn(`Failed to create payment escalation task: ${e.message}`);
          return false;
        }
      }
      return true;
    }

    if (stage === 'manager_notify') {
      try {
        const leadRecord = await this.prisma.lead.findUnique({
          where: { id: lead.id },
          select: { tenantId: true },
        });
        if (leadRecord) {
          const managers = await this.prisma.user.findMany({
            where: { tenantId: leadRecord.tenantId, role: { in: ['MANAGER', 'OWNER', 'ADMIN'] }, active: true },
            select: { id: true },
          });
          for (const manager of managers) {
            await this.prisma.task.create({
              data: {
                title: `Manager alert: Payment overdue for ${name}`,
                description: payload.text || `${payload.label || 'Payment'} overdue for 8+ days — manager review required.`,
                priority: 'high',
                leadId: lead.id,
                assigneeId: manager.id,
                dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
                createdBy: 'system',
                source: 'payment_escalation_manager',
              },
            });
          }
          this.logger.log(`Payment escalation notified ${managers.length} manager(s) for lead ${lead.id}`);
        }
      } catch (e: any) {
        this.logger.warn(`Failed to notify managers for payment escalation: ${e.message}`);
        return false;
      }
      return true;
    }

    if (stage === 'collections') {
      try {
        const leadRecord = await this.prisma.lead.findUnique({
          where: { id: lead.id },
          select: { tenantId: true },
        });
        if (leadRecord) {
          const admins = await this.prisma.user.findMany({
            where: { tenantId: leadRecord.tenantId, role: { in: ['ADMIN', 'OWNER'] }, active: true },
            select: { id: true },
          });
          for (const admin of admins) {
            await this.prisma.task.create({
              data: {
                title: `Collections escalation: Payment overdue for ${name}`,
                description: payload.text || `${payload.label || 'Payment'} overdue for 14+ days — escalate to collections.`,
                priority: 'urgent',
                leadId: lead.id,
                assigneeId: admin.id,
                dueAt: new Date(Date.now() + 12 * 60 * 60 * 1000),
                createdBy: 'system',
                source: 'payment_escalation_collections',
              },
            });
          }
          this.logger.log(`Payment escalation sent to collections for lead ${lead.id}`);
        }
      } catch (e: any) {
        this.logger.warn(`Failed to escalate payment to collections: ${e.message}`);
        return false;
      }
      return true;
    }

    this.logger.warn(`Unknown payment escalation stage: ${stage}`);
    return false;
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
