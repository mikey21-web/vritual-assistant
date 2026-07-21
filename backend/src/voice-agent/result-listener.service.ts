import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TimelineService } from '../timeline/timeline.service';

@Injectable()
export class ResultListenerService {
  private readonly logger = new Logger(ResultListenerService.name);

  constructor(
    private prisma: PrismaService,
    private timeline: TimelineService,
  ) {}

  async onMessageDelivered(leadId: string, channel: string, messageId: string, status: string): Promise<void> {
    await this.timeline.recordDeliveryUpdated(leadId, channel, status);
    if (status === 'read') {
      await this.updateLeadContext(leadId, { lastReadAt: new Date().toISOString() });
    }
  }

  async onMessageReplied(leadId: string, channel: string, text: string): Promise<void> {
    await this.updateLeadContext(leadId, { lastReplyAt: new Date().toISOString(), lastReplyChannel: channel, lastReplyText: text.slice(0, 200) });
  }

  async onCallCompleted(leadId: string, outcome: {
    status: string; durationSec?: number; answered: boolean;
    wantsSiteVisit?: boolean; notInterested?: boolean; callLater?: boolean;
  }): Promise<void> {
    const context: any = { lastCallAt: new Date().toISOString(), lastCallStatus: outcome.status, lastCallDuration: outcome.durationSec };
    if (outcome.answered) context.lastCallAnswered = true;
    if (outcome.wantsSiteVisit) context.wantsSiteVisit = true;
    if (outcome.notInterested) context.notInterested = true;

    await this.updateLeadContext(leadId, context);
  }

  async onWhatsAppFailed(leadId: string, error: string): Promise<void> {
    await this.updateLeadContext(leadId, { lastWhatsAppFailed: true, lastWhatsAppError: error.slice(0, 200) });
    await this.timeline.add({
      type: 'delivery_updated', title: 'WhatsApp failed', description: error.slice(0, 300), leadId,
    });
  }

  private async updateLeadContext(leadId: string, updates: Record<string, unknown>): Promise<void> {
    try {
      const lead = await this.prisma.lead.findUnique({ where: { id: leadId }, select: { metadata: true } });
      if (!lead) return;
      const meta = (lead.metadata as any) || {};
      await this.prisma.lead.update({
        where: { id: leadId },
        data: { metadata: { ...meta, ...updates } },
      });
    } catch (e: any) {
      this.logger.warn(`Failed to update lead context for ${leadId}: ${e.message}`);
    }
  }
}
