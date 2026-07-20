import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { WhatsAppCloudAdapter } from '../shared/adapters/messaging.adapter';
import { EmailAdapter } from '../shared/adapters/email.adapter';
import { AutonomousActionService } from './autonomous-action.service';
import { MemoryService } from './memory.service';

const DEFAULT_TENANT_ID = 'default-tenant';

/**
 * Mikey speaking first, not waiting to be asked: every owner/admin gets a text
 * digest at 8am summarizing what happened overnight and what needs them today.
 * WhatsApp requires a pre-approved template outside the 24h session window, so
 * it's opt-in via MIKEY_DAILY_DIGEST_TEMPLATE; email always fires as the
 * channel that needs no approval and is guaranteed to land.
 */
@Injectable()
export class MorningDigestService {
  private readonly logger = new Logger(MorningDigestService.name);

  constructor(
    private prisma: PrismaService,
    private analytics: AnalyticsService,
    private whatsAppAdapter: WhatsAppCloudAdapter,
    private emailAdapter: EmailAdapter,
    private config: ConfigService,
    private autonomousActions: AutonomousActionService,
    private memory: MemoryService,
  ) {}

  async sendDailyDigests(days = 1): Promise<void> {
    const owners = await this.prisma.user.findMany({
      where: { role: { in: ['OWNER', 'ADMIN'] }, active: true },
    });
    if (owners.length === 0) return;

    const [summary, overnightActions, pendingRules] = await Promise.all([
      this.analytics.teamCommand(),
      this.autonomousActions.findRecent(DEFAULT_TENANT_ID, days === 30 ? 720 : 24),
      this.memory.getPendingRules(DEFAULT_TENANT_ID),
    ]);
    const label = days === 30 ? 'monthly' : 'daily';
    const text = this.buildDigestText(summary, overnightActions, pendingRules.length, label);

    for (const owner of owners) {
      await this.sendToOwner(owner, text);
    }
    this.logger.log(`Morning digest sent to ${owners.length} owner/admin(s)`);
  }

  private buildDigestText(
    s: Awaited<ReturnType<AnalyticsService['teamCommand']>>,
    overnightActions: Array<{ tool: string; findingType: string }>,
    pendingRuleCount: number,
    label = 'daily',
  ): string {
    const lines = [
      label === 'monthly'
        ? "Your monthly report is ready. Here's how things went this month:"
        : "Good morning. Here's your brief while you were away:",
      '',
      `${s.todayVisitsCount} site visit(s) booked for today.`,
      s.unassignedHotLeads.length > 0
        ? `${s.unassignedHotLeads.length} hot lead(s) have no agent assigned: ${s.unassignedHotLeads.slice(0, 3).map(l => l.name).join(', ')}.`
        : 'No unassigned hot leads.',
      s.staleHotLeads.length > 0
        ? `${s.staleHotLeads.length} hot lead(s) haven't been touched in over 2 hours.`
        : 'All hot leads are being worked.',
      s.overdueTasksCount > 0
        ? `${s.overdueTasksCount} task(s) overdue across the team.`
        : 'No overdue tasks.',
      `Overall conversion rate: ${s.overallConversionRate}%.`,
    ];

    if (overnightActions.length > 0) {
      const assigned = overnightActions.filter(a => a.tool === 'assign_lead_to_agent').length;
      const nudged = overnightActions.filter(a => a.tool === 'send_message').length;
      const parts: string[] = [];
      if (assigned > 0) parts.push(`reassigned ${assigned} unassigned hot lead(s)`);
      if (nudged > 0) parts.push(`sent ${nudged} re-engagement follow-up(s)`);
      lines.push('', `While you were away, I ${parts.join(' and ')} on my own.`);
    }

    if (pendingRuleCount > 0) {
      lines.push('', `${pendingRuleCount} thing(s) I've learned are waiting for your approval before I start applying them.`);
    }

    return lines.join('\n');
  }

  private async sendToOwner(owner: { phone: string | null; email: string; name: string }, text: string): Promise<void> {
    const templateId = this.config.get<string>('MIKEY_DAILY_DIGEST_TEMPLATE');
    if (owner.phone && templateId) {
      try {
        await this.whatsAppAdapter.sendMessage(owner.phone, text, {
          phoneNumberId: this.config.get<string>('WHATSAPP_PHONE_NUMBER_ID'),
          accessToken: this.config.get<string>('WHATSAPP_ACCESS_TOKEN'),
          within24h: false,
          templateId,
          templateComponents: [{ type: 'BODY', parameters: [{ type: 'text', text }] }],
        });
      } catch (err: any) {
        this.logger.error(`WhatsApp digest failed for ${owner.name}: ${err.message}`);
      }
    }

    if (owner.email) {
      try {
        const html = `<p>${text.replace(/\n/g, '<br/>')}</p>`;
        await this.emailAdapter.send(owner.email, "Mikey's morning brief", html);
      } catch (err: any) {
        this.logger.error(`Email digest failed for ${owner.name}: ${err.message}`);
      }
    }
  }
}
