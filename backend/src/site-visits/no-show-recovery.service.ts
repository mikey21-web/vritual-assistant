import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppCloudAdapter } from '../shared/adapters/messaging.adapter';

@Injectable()
export class NoShowRecoveryService {
  private readonly logger = new Logger(NoShowRecoveryService.name);

  constructor(
    private prisma: PrismaService,
    private whatsAppAdapter: WhatsAppCloudAdapter,
    private config: ConfigService,
  ) {}

  async process(
    leadId: string,
    payload: { step?: string; siteVisitId?: string; channel?: string },
  ): Promise<{ processed: boolean; error?: string }> {
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
      include: { contact: true },
    });
    if (!lead) return { processed: false, error: 'Lead not found' };

    const step = payload.step;
    if (!step) return { processed: false, error: 'No step specified' };

    const contact = lead.contact;
    if (!contact) return { processed: false, error: 'Contact not found' };

    const name = contact.name?.split(/\s+/)[0] || 'there';

    switch (step) {
      case 'we_missed_you': {
        const text = `Hi ${name}, we missed you at your scheduled visit. No worries at all! We'd love to reschedule at a time that works better for you.`;
        return this.sendMessage(lead, contact, text, payload.channel);
      }
      case 'reschedule_offer': {
        const text = `Hi ${name}, we have availability this week. Would any slots work for you? Let us know and we'll get you booked in.`;
        return this.sendMessage(lead, contact, text, payload.channel);
      }
      case 'escalate_to_manager': {
        return this.escalateToManager(lead, payload);
      }
      default:
        return { processed: false, error: `Unknown step: ${step}` };
    }
  }

  private async sendMessage(
    lead: any,
    contact: any,
    text: string,
    channel?: string,
  ): Promise<{ processed: boolean; error?: string }> {
    const to = contact.whatsapp || contact.phone;
    if (!to) return { processed: false, error: 'No phone number' };

    const waConfig = {
      phoneNumberId: this.config.get<string>('WHATSAPP_PHONE_NUMBER_ID') || '',
      accessToken: this.config.get<string>('WHATSAPP_ACCESS_TOKEN') || '',
    };

    const result = await this.whatsAppAdapter.sendMessage(to, text, waConfig);
    if (!result.success) {
      this.logger.warn(`No-show recovery message failed for lead ${lead.id}: ${result.error}`);
      return { processed: false, error: result.error || 'Send failed' };
    }

    this.logger.log(`No-show recovery message sent to lead ${lead.id}`);
    return { processed: true };
  }

  private async escalateToManager(
    lead: any,
    payload: any,
  ): Promise<{ processed: boolean; error?: string }> {
    const assigneeId = lead.assignedAgentId || payload.agentId;
    if (!assigneeId) return { processed: false, error: 'No assignee' };

    try {
      await this.prisma.task.create({
        data: {
          title: `Escalation: No-show recovery for ${lead.contact?.name || lead.id}`,
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
      return { processed: true };
    } catch (e: any) {
      return { processed: false, error: e.message };
    }
  }
}
