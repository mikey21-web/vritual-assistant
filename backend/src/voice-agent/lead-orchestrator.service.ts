import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { VoiceAgentService } from './voice-agent.service';
import { ConversationsService } from '../conversations/conversations.service';
import { OutboundWebhookDispatchService } from '../shared/outbound-webhook-dispatch.service';

interface ActionPlan {
  call?: { priority: number; lang: string };
  whatsapp?: { priority: number; text: string };
  sms?: { priority: number; text: string };
  email?: { priority: number; subject: string; html: string };
  waitHours?: number;
}

@Injectable()
export class LeadOrchestratorService {
  private readonly logger = new Logger(LeadOrchestratorService.name);

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
    private voiceAgent: VoiceAgentService,
    private conversations: ConversationsService,
    private outboundDispatch: OutboundWebhookDispatchService,
  ) {}

  async onLeadCreated(leadId: string): Promise<void> {
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        contact: true,
        campaign: true,
        tenant: { select: { settings: true } },
      },
    });
    if (!lead) { this.logger.warn(`Lead ${leadId} not found`); return; }

    const plan = this.buildActionPlan(lead);
    if (!plan) return;

    const userId = lead.assignedAgentId || 'mikey-auto';

    // Execute actions in priority order (lower number = sooner)
    const actions: Array<() => Promise<void>> = [];
    if (plan.call) actions.push(() => this.executeCall(lead, plan.call!.lang, userId));
    if (plan.whatsapp) actions.push(() => this.executeWhatsApp(lead, plan.whatsapp!.text, userId));
    if (plan.sms) actions.push(() => this.executeSms(lead, plan.sms!.text, userId));
    if (plan.email) actions.push(() => this.executeEmail(lead, plan.email!.subject, plan.email!.html, userId));

    actions.sort((a, b) => {
      const pa = plan.call && a.name === 'executeCall' ? plan.call.priority : 99;
      const pb = plan.call && b.name === 'executeCall' ? plan.call.priority : 99;
      return pa - pb;
    });

    for (const action of actions) {
      try { await action(); } catch (e: any) { this.logger.error(`Action failed for lead ${leadId}: ${e.message}`); }
      if (plan.waitHours) await new Promise(r => setTimeout(r, plan.waitHours! * 1000));
    }
  }

  private buildActionPlan(lead: any): ActionPlan | null {
    const tenantSettings = (lead.tenant?.settings || {}) as any;
    const source = lead.source as string;
    const campaign = lead.campaign;
    const phone = lead.contact?.phone;
    const whatsapp = lead.contact?.whatsapp || phone;

    // Campaign auto-actions override everything
    const campaignChannels = campaign?.channels
      ? (typeof campaign.channels === 'string' ? JSON.parse(campaign.channels) : campaign.channels)
      : [];

    // Look for auto-action config in campaign channels (or a dedicated autoActions field on campaign)
    // ponytail: uses campaign.channels[].autoAction flag; extend with dedicated field if per-campaign actions grow complex
    const autoActions = campaign
      ? this.campaignAutoActions(campaign)
      : tenantSettings.autoActions || this.sourceDefaults(source);

    if (!autoActions || Object.keys(autoActions).length === 0) {
      // Fallback: default auto-call for leads with phone
      if (phone && tenantSettings.autoCallOnLead !== false) {
        return { call: { priority: 1, lang: this.detectLanguage(lead) } };
      }
      return null;
    }

    const plan: ActionPlan = {};
    for (const action of autoActions) {
      if (action.type === 'call' && phone) {
        plan.call = { priority: action.priority || 1, lang: action.lang || this.detectLanguage(lead) };
      }
      if (action.type === 'whatsapp' && whatsapp) {
        plan.whatsapp = { priority: action.priority || 2, text: action.text || this.defaultWhatsAppText(lead) };
      }
      if (action.type === 'sms' && phone) {
        plan.sms = { priority: action.priority || 3, text: action.text || this.defaultSmsText(lead) };
      }
      if (action.type === 'email' && lead.contact?.email) {
        plan.email = { priority: action.priority || 4, subject: action.subject || 'Thanks for your interest', html: action.html || this.defaultEmailHtml(lead) };
      }
    }
    return Object.keys(plan).length ? plan : null;
  }

  private campaignAutoActions(campaign: any): any[] {
    const channels = (typeof campaign.channels === 'string' ? JSON.parse(campaign.channels) : campaign.channels) as any[];
    const actions = channels.filter((c: any) => c.autoAction || c.onLeadCreate);
    if (actions.length) return actions;

    // Try a dedicated autoActions field on the campaign object
    const raw = (campaign as any).autoActions || campaign.metadata?.autoActions || null;
    if (raw) return typeof raw === 'string' ? JSON.parse(raw) : raw;

    return [];
  }

  private sourceDefaults(source: string): any[] {
    // ponytail: simple mapping; extend with editable tenant-level rules if per-source config becomes a request
    const map: Record<string, any[]> = {
      META_ADS: [{ type: 'whatsapp', priority: 1, text: 'Hi! Thanks for reaching out via our ad. How can I help you today?' }],
      GOOGLE_ADS: [{ type: 'whatsapp', priority: 1, text: 'Thanks for your inquiry! Let me know if you need more details.' }],
      WHATSAPP: [{ type: 'call', priority: 1, lang: 'en' }],
      FORM: [{ type: 'whatsapp', priority: 1, text: 'Thanks for your interest! Shall I share more details?' }],
      PHONE_CALL: [{ type: 'whatsapp', priority: 1, text: 'We missed your call. Let us know how we can help!' }],
      PORTAL: [{ type: 'call', priority: 1, lang: 'en' }],
      CHATBOT: [{ type: 'call', priority: 1, lang: 'en' }],
    };
    return map[source] || [];
  }

  private async executeCall(lead: any, lang: string, userId: string): Promise<void> {
    if (!lead.contact?.phone) return;
    this.logger.log(`Auto-calling lead ${lead.id} (${lead.contact.name}) in ${lang}`);
    const result = await this.voiceAgent.callLead(lead.id, userId, lang);
    if (!result.success) this.logger.warn(`Auto-call failed for ${lead.id}: ${result.message}`);
  }

  private async executeWhatsApp(lead: any, text: string, userId: string): Promise<void> {
    const to = lead.contact?.whatsapp || lead.contact?.phone;
    if (!to) return;
    this.logger.log(`Auto-WhatsApp to lead ${lead.id}`);
    try {
      await this.conversations.create({
        text,
        channel: 'WHATSAPP',
        direction: 'OUTBOUND',
        leadId: lead.id,
        contactId: lead.contactId,
      }, userId);
    } catch (e: any) {
      if (e.name !== 'ForbiddenException') throw e;
      this.logger.warn(`WhatsApp blocked by policy for lead ${lead.id}: ${e.message}`);
    }
  }

  private async executeSms(lead: any, text: string, userId: string): Promise<void> {
    if (!lead.contact?.phone) return;
    this.logger.log(`Auto-SMS to lead ${lead.id}`);
    try {
      await this.conversations.create({
        text,
        channel: 'SMS',
        direction: 'OUTBOUND',
        leadId: lead.id,
        contactId: lead.contactId,
      }, userId);
    } catch (e: any) {
      if (e.name !== 'ForbiddenException') throw e;
    }
  }

  private async executeEmail(lead: any, subject: string, html: string, userId: string): Promise<void> {
    if (!lead.contact?.email) return;
    this.logger.log(`Auto-email to lead ${lead.id}`);
    try {
      await this.conversations.create({
        text: html,
        subject,
        channel: 'EMAIL',
        direction: 'OUTBOUND',
        leadId: lead.id,
        contactId: lead.contactId,
      }, userId);
    } catch (e: any) {
      if (e.name !== 'ForbiddenException') throw e;
    }
  }

  async handleCallWebhook(payload: any): Promise<void> {
    const { call_sid, lead_id, status, transcript, summary, duration_seconds, ended_reason } = payload;
    if (!lead_id) return;

    const lead = await this.prisma.lead.findUnique({
      where: { id: lead_id },
      select: { id: true, tenantId: true, assignedAgentId: true },
    });
    if (!lead) { this.logger.warn(`Call webhook: lead ${lead_id} not found`); return; }

    const callStatus = this.mapCallStatus(status || 'COMPLETED', ended_reason);

    await this.prisma.callLog.updateMany({
      where: { leadId: lead_id, providerSid: call_sid },
      data: {
        status: callStatus,
        durationSec: duration_seconds ? Math.round(duration_seconds) : undefined,
        recordingUrl: payload.recording_url,
        transcript: transcript || undefined,
        summary: summary || undefined,
        outcome: payload.outcome || undefined,
      },
    });

    const userId = lead.assignedAgentId || (await this.prisma.user.findFirst({
      where: { tenantId: lead.tenantId, role: 'OWNER' },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    }))?.id || 'system';

    await this.prisma.internalNote.create({
      data: {
        leadId: lead_id,
        userId,
        content: `📞 Call completed (${duration_seconds || '?'}s)\nTranscript: ${(transcript || 'N/A').slice(0, 2000)}\nSummary: ${(summary || 'N/A').slice(0, 1000)}`,
      },
    });

    if (payload.outcome || summary) {
      const outcome = payload.outcome
        ? this.mapStructuredOutcome(payload.outcome)
        : this.parseCallOutcome(summary, transcript || '');
      if (outcome.status) {
        await this.prisma.lead.update({
          where: { id: lead_id },
          data: { status: outcome.status as any },
        }).catch(() => {});
      }
      if (outcome.followUpDays) {
        const dueAt = new Date();
        dueAt.setDate(dueAt.getDate() + outcome.followUpDays);
        await this.prisma.task.create({
          data: {
            leadId: lead_id,
            title: outcome.followUpTitle || `Follow-up call (${outcome.followUpDays}d)`,
            priority: outcome.followUpDays <= 2 ? 'HIGH' : 'MEDIUM',
            dueAt,
            status: 'pending',
            createdBy: 'mikey-auto',
          },
        }).catch(() => {});
      }
    }

    this.outboundDispatch.dispatch('call.completed', {
      leadId: lead_id,
      callSid: call_sid,
      status: callStatus,
      durationSec: duration_seconds ? Math.round(duration_seconds) : undefined,
      transcript,
      summary,
      outcome: payload.outcome,
    }).catch((e) => this.logger.warn(`Outbound webhook dispatch failed for lead ${lead_id}: ${e.message}`));

    this.logger.log(`Call webhook processed for lead ${lead_id}`);
  }

  private mapCallStatus(status: string, endedReason?: string): any {
    if (status === 'completed' || status === 'COMPLETED') return 'COMPLETED';
    if (status === 'failed' || status === 'FAILED') return 'FAILED';
    if (status === 'no-answer' || status === 'NO_ANSWER' || endedReason === 'no_answer') return 'NO_ANSWER';
    if (status === 'busy' || status === 'BUSY') return 'BUSY';
    return 'COMPLETED';
  }

  private detectLanguage(lead: any): string {
    const lang = (lead as any).languagePreference || lead.contact?.language || 'en';
    const supported = ['en', 'hi', 'te', 'ta', 'kn', 'ml', 'bn', 'mr', 'gu'];
    return supported.includes(lang) ? lang : 'en';
  }

  private mapStructuredOutcome(outcome: any): { status?: string; followUpDays?: number; followUpTitle?: string } {
    const callStatus = outcome.call_status;
    if (callStatus === 'wrong_number' || callStatus === 'not_interested') return { status: 'LOST' };
    if (outcome.wants_site_visit) return { status: 'APPOINTMENT_BOOKED', followUpDays: 1, followUpTitle: 'Confirm site visit' };
    if (outcome.timeline === 'immediate' || outcome.timeline === '3_months') return { status: 'QUALIFIED', followUpDays: 1, followUpTitle: 'Send project details' };
    if (outcome.timeline === '6_months') return { followUpDays: 5, followUpTitle: 'Follow-up call' };
    return { followUpDays: 3, followUpTitle: 'Follow-up call' };
  }

  private parseCallOutcome(summary: string, transcript: string): { status?: string; followUpDays?: number; followUpTitle?: string } {
    const lower = (summary + ' ' + transcript).toLowerCase();
    if (lower.includes('not interested') || lower.includes('no thanks')) return { status: 'LOST' };
    if (lower.includes('site visit') || lower.includes('visit')) return { status: 'APPOINTMENT_BOOKED', followUpDays: 1, followUpTitle: 'Confirm site visit' };
    if (lower.includes('budget') || lower.includes('price') || lower.includes('cost')) return { followUpDays: 2, followUpTitle: 'Share pricing details' };
    if (lower.includes('follow') || lower.includes('call back') || lower.includes('later')) return { followUpDays: 3, followUpTitle: 'Follow-up call' };
    if (lower.includes('interested') || lower.includes('yes') || lower.includes('want')) return { status: 'QUALIFIED', followUpDays: 1, followUpTitle: 'Send project details' };
    return { followUpDays: 3, followUpTitle: 'Follow-up call' };
  }

  private defaultWhatsAppText(lead: any): string {
    return `Hi ${lead.contact?.name || 'there'}! Thanks for your interest. I'm Mikey, your virtual assistant. How can I help you with properties today?`;
  }

  private defaultSmsText(lead: any): string {
    return `Hi ${lead.contact?.name || 'there'}! Thanks for reaching out. Reply anytime or call us for more details.`;
  }

  private defaultEmailHtml(lead: any): string {
    return `<p>Hi ${lead.contact?.name || 'there'},</p><p>Thanks for your interest! We'll be in touch shortly with more details.</p>`;
  }
}
