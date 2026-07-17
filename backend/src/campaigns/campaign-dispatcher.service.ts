import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConversationsService } from '../conversations/conversations.service';

interface TargetingConfig {
  propertyTypes?: string[];
  budgetRanges?: string[];
  locations?: string[];
  buyerType?: string;
  minScore?: number;
  segments?: string[];
  statuses?: string[];
}

interface ChannelConfig {
  type: string;
  config?: Record<string, any>;
  active?: boolean;
}

interface CreativeConfig {
  name?: string;
  type?: string;
  headline?: string;
  body?: string;
  cta?: string;
  imageUrl?: string;
}

@Injectable()
export class CampaignDispatcherService {
  private readonly logger = new Logger(CampaignDispatcherService.name);

  constructor(
    private prisma: PrismaService,
    private conversationsService: ConversationsService,
  ) {}

  async dispatchCampaign(campaignId: string, userId?: string): Promise<{ sent: number; skipped: number; errors: number }> {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { tenant: true },
    });
    if (!campaign) throw new NotFoundException('Campaign not found');

    const targeting = (typeof campaign.targeting === 'string' ? JSON.parse(campaign.targeting) : campaign.targeting) as TargetingConfig;
    const channels = (typeof campaign.channels === 'string' ? JSON.parse(campaign.channels) : campaign.channels) as ChannelConfig[];
    const creatives = (typeof campaign.creatives === 'string' ? JSON.parse(campaign.creatives) : campaign.creatives) as CreativeConfig[];

    const activeChannels = channels.filter(c => c.active !== false);
    if (activeChannels.length === 0) {
      this.logger.warn(`Campaign ${campaignId} has no active channels`);
      return { sent: 0, skipped: 0, errors: 0 };
    }

    const leadWhere: any = { tenantId: campaign.tenantId };
    if (targeting.minScore) leadWhere.score = { gte: targeting.minScore };
    if (targeting.segments?.length) leadWhere.segment = { in: targeting.segments };
    if (targeting.statuses?.length) leadWhere.status = { in: targeting.statuses };
    if (targeting.locations?.length) {
      leadWhere.contact = { location: { in: targeting.locations } };
    }

    const leads = await this.prisma.lead.findMany({
      where: leadWhere,
      include: { contact: true },
    });

    const creative = creatives[0];
    const messageText = creative?.body || creative?.headline || campaign.description || '';

    let sent = 0, skipped = 0, errors = 0;

    for (const lead of leads) {
      try {
        await this.conversationsService.create({
          text: messageText,
          channel: activeChannels[0].type,
          direction: 'OUTBOUND',
          leadId: lead.id,
          contactId: lead.contactId,
          campaignId: campaign.id,
          messageTemplateId: null,
        });
        sent++;
      } catch (e: any) {
        if (e.name === 'ForbiddenException') {
          skipped++;
        } else {
          errors++;
          this.logger.error(`Failed to dispatch campaign ${campaignId} to lead ${lead.id}: ${e.message}`);
        }
      }
    }

    // Update campaign metrics
    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: {
        totalLeads: leads.length,
        totalSpend: 0,
        costPerLead: 0,
      },
    });

    this.logger.log(`Campaign ${campaignId} dispatched: ${sent} sent, ${skipped} skipped, ${errors} errors`);
    return { sent, skipped, errors };
  }
}
