import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConversationsService } from '../conversations/conversations.service';
import { EventsService } from '../events/events.service';
import { AutonomyGuardrailsService } from './autonomy-guardrails.service';
import { AutonomousActionService } from './autonomous-action.service';
import type { SchedulerFinding } from './mikey-scheduler.types';

const DEFAULT_TENANT_ID = 'default-tenant';

/**
 * The triage core: turns a detected finding into a decision — act silently,
 * act and tell the owner, or leave it for the 8am digest — then executes
 * deterministically (no LLM call) so autonomous writes stay reliable and
 * cheap. Judgment calls that need real reasoning stay with the LLM/copilot
 * path; this layer only handles the two finding types with an unambiguous,
 * safe, reversible-or-low-risk remedy.
 */
@Injectable()
export class SalienceEngineService {
  private readonly logger = new Logger(SalienceEngineService.name);

  constructor(
    private prisma: PrismaService,
    private conversations: ConversationsService,
    private events: EventsService,
    private guardrails: AutonomyGuardrailsService,
    private actions: AutonomousActionService,
  ) {}

  /** Feeds ReflexionService's trajectory builder (which reads mikey.* SystemEvents by leadId) so a later win/loss reflection knows Mikey acted here on its own. */
  private async emitAutonomousActionEvent(leadId: string, tool: string, payload: Record<string, unknown>) {
    await this.events.emit({
      type: 'mikey.autonomous_action',
      source: 'salience-engine',
      leadId,
      payload: { tool, ...payload },
    });
  }

  async route(finding: SchedulerFinding): Promise<{ acted: boolean; summary?: string }> {
    switch (finding.type) {
      case 'unassigned_hot_leads':
        return this.handleUnassignedHotLeads(finding);
      case 'stale_hot_leads':
        return this.handleStaleHotLeads(finding);
      default:
        return { acted: false };
    }
  }

  /** Assign each unassigned hot lead to the least-loaded active sales agent. Fully reversible. */
  private async handleUnassignedHotLeads(finding: SchedulerFinding): Promise<{ acted: boolean; summary?: string }> {
    const gate = await this.guardrails.canActInternally(DEFAULT_TENANT_ID);
    if (!gate.allowed) {
      this.logger.log(`Skipping auto-assign: ${gate.reason}`);
      return { acted: false };
    }

    const leadIds: string[] = finding.metadata?.leadIds || [];
    if (leadIds.length === 0) return { acted: false };

    const agents = await this.prisma.user.findMany({
      where: { role: 'SALES_AGENT', active: true },
      include: { assignedLeads: { where: { status: { notIn: ['CONVERTED', 'LOST', 'SPAM'] } } } },
    });
    if (agents.length === 0) return { acted: false }; // nobody to assign to — surfaces via the finding itself, not silently dropped

    let assigned = 0;
    for (const leadId of leadIds) {
      // Re-sort each time so consecutive assignments in this batch spread out
      // instead of all landing on whoever was least-loaded at the start.
      const leastLoaded = [...agents].sort((a, b) => a.assignedLeads.length - b.assignedLeads.length)[0];
      await this.prisma.lead.update({ where: { id: leadId }, data: { assignedAgentId: leastLoaded.id } });
      leastLoaded.assignedLeads.push({} as any); // reflect the new load locally for the next iteration's sort
      await this.actions.record({
        tenantId: DEFAULT_TENANT_ID,
        findingType: finding.type,
        tool: 'assign_lead_to_agent',
        leadId,
        args: { agentId: leastLoaded.id },
        result: `Assigned to ${leastLoaded.name}`,
        undoable: true,
        undoData: { previousAgentId: null },
      });
      await this.emitAutonomousActionEvent(leadId, 'assign_lead_to_agent', { agentId: leastLoaded.id, findingType: finding.type });
      assigned++;
    }

    return { acted: assigned > 0, summary: `Auto-assigned ${assigned} unassigned hot lead(s) to the least-loaded agent(s).` };
  }

  /** Send a light re-engagement nudge to hot leads that have gone quiet, respecting quiet hours/cooldown/cap. Not reversible (a sent message can't be unsent), so logged but never marked undoable. */
  private async handleStaleHotLeads(finding: SchedulerFinding): Promise<{ acted: boolean; summary?: string }> {
    const leadIds: string[] = finding.metadata?.leadIds || [];
    if (leadIds.length === 0) return { acted: false };

    let sent = 0;
    for (const leadId of leadIds) {
      const gate = await this.guardrails.canMessageLeadAutonomously(DEFAULT_TENANT_ID, leadId);
      if (!gate.allowed) {
        this.logger.log(`Skipping auto-nudge for lead ${leadId}: ${gate.reason}`);
        continue;
      }

      const lead = await this.prisma.lead.findUnique({ where: { id: leadId }, include: { contact: true } });
      if (!lead) continue;

      const name = lead.contact?.name || 'there';
      const interestLine = lead.interest ? ` about ${lead.interest}` : '';
      const text = `Hi ${name}, just checking in${interestLine} — still interested? Happy to answer any questions or set up a time to talk.`;

      try {
        await this.conversations.create({ leadId, channel: 'WHATSAPP', direction: 'OUTBOUND', text });
      } catch (err: any) {
        this.logger.warn(`Auto-nudge blocked for lead ${leadId}: ${err.message}`);
        continue;
      }

      await this.actions.record({
        tenantId: DEFAULT_TENANT_ID,
        findingType: finding.type,
        tool: 'send_message',
        leadId,
        args: { channel: 'WHATSAPP', text },
        result: 'Follow-up sent',
        undoable: false,
      });
      await this.emitAutonomousActionEvent(leadId, 'send_message', { channel: 'WHATSAPP', findingType: finding.type });
      sent++;
    }

    return { acted: sent > 0, summary: `Sent a re-engagement follow-up to ${sent} stale hot lead(s).` };
  }
}
