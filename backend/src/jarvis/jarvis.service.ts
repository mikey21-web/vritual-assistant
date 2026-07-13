import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { KhojClientService } from '../khoj-client/khoj-client.service';
import { OutcomeEngineService } from './outcome-engine.service';
import { EventsService } from '../events/events.service';

export type RiskLevel = 'low' | 'medium' | 'high';

export interface ActionRule {
  tool: string;
  risk: RiskLevel;
  autoExecute: boolean;
  description: string;
}

const ACTION_RULES: ActionRule[] = [
  { tool: 'search_leads', risk: 'low', autoExecute: true, description: 'Search leads' },
  { tool: 'search_contacts', risk: 'low', autoExecute: true, description: 'Search contacts' },
  { tool: 'get_lead_detail', risk: 'low', autoExecute: true, description: 'Get lead details' },
  { tool: 'list_tickets', risk: 'low', autoExecute: true, description: 'List tickets' },
  { tool: 'list_campaigns', risk: 'low', autoExecute: true, description: 'List campaigns' },
  { tool: 'get_analytics_overview', risk: 'low', autoExecute: true, description: 'Get analytics' },
  { tool: 'run_report', risk: 'low', autoExecute: true, description: 'Run report' },
  { tool: 'navigate_ui', risk: 'low', autoExecute: true, description: 'Navigate UI' },
  { tool: 'explain_flow', risk: 'low', autoExecute: true, description: 'Explain flow' },
  { tool: 'analyze_lead_source', risk: 'low', autoExecute: true, description: 'Analyze lead source' },
  { tool: 'draft_message', risk: 'low', autoExecute: true, description: 'Draft message' },
  { tool: 'create_custom_field', risk: 'low', autoExecute: true, description: 'Create custom field' },
  { tool: 'create_task', risk: 'medium', autoExecute: false, description: 'Create task (auto-executable)' },
  { tool: 'create_ticket', risk: 'medium', autoExecute: false, description: 'Create ticket (auto-executable)' },
  { tool: 'update_lead_status', risk: 'high', autoExecute: false, description: 'Update lead status' },
  { tool: 'send_message', risk: 'high', autoExecute: false, description: 'Send message' },
  { tool: 'create_campaign', risk: 'high', autoExecute: false, description: 'Create campaign' },
  { tool: 'update_ticket', risk: 'high', autoExecute: false, description: 'Update ticket' },
  { tool: 'initiate_call', risk: 'high', autoExecute: false, description: 'Initiate call' },
  { tool: 'send_email', risk: 'high', autoExecute: false, description: 'Send email' },
  { tool: 'bulk_send_message', risk: 'high', autoExecute: false, description: 'Bulk send message' },
];

@Injectable()
export class JarvisService {
  private readonly logger = new Logger(JarvisService.name);

  constructor(
    private prisma: PrismaService,
    private khoj: KhojClientService,
    private outcomeEngine: OutcomeEngineService,
    private events: EventsService,
  ) {}

  getActionRisk(tool: string): { rule: ActionRule; risk: RiskLevel } {
    const rule = ACTION_RULES.find(r => r.tool === tool);
    return {
      rule: rule || { tool, risk: 'high', autoExecute: false, description: tool },
      risk: rule?.risk || 'high',
    };
  }

  canAutoExecute(tool: string): boolean {
    return ACTION_RULES.find(r => r.tool === tool)?.autoExecute ?? false;
  }

  getActionRules(): ActionRule[] {
    return ACTION_RULES;
  }

  async processProactiveSuggestion(finding: {
    type: string;
    title: string;
    description: string;
    severity: string;
    metadata: any;
  }): Promise<{ action: string; reason: string } | null> {
    if (finding.severity !== 'critical') return null;

    if (finding.type === 'unassigned_hot_leads' && finding.metadata?.leadIds?.length > 0) {
      const agents = await this.prisma.user.findMany({
        where: { role: 'SALES_AGENT', active: true },
        include: { assignedLeads: { where: { status: { notIn: ['CONVERTED', 'LOST', 'SPAM'] } } } },
      });

      if (agents.length === 0) return null;
      const leastLoaded = agents.sort((a, b) => a.assignedLeads.length - b.assignedLeads.length)[0];

      const leadId = finding.metadata.leadIds[0];
      await this.prisma.lead.update({
        where: { id: leadId },
        data: { assignedAgentId: leastLoaded.id },
      });

      const reason = `Auto-assigned lead ${leadId} to ${leastLoaded.name || leastLoaded.email} (lowest current load: ${leastLoaded.assignedLeads.length} active leads)`;
      this.logger.log(reason);
      return { action: `assigned_lead:${leadId}`, reason };
    }

    if (finding.type === 'stale_hot_leads' && finding.metadata?.leadIds?.length > 0) {
      const leadIds = finding.metadata.leadIds.slice(0, 5);
      for (const leadId of leadIds) {
        await this.khoj.saveMemory(`Lead ${leadId} flagged as stale hot lead — follow-up recommended. ${finding.description}`);
      }
      return { action: `flagged_${leadIds.length}_stale_hot_leads`, reason: `Created Khoj memory entries for ${leadIds.length} stale hot leads. Staff will be notified via dashboard.` };
    }

    return null;
  }

  async runAutonomousAction(params: { leadId?: string; action: string; args: any }): Promise<{ success: boolean; result: string }> {
    const risk = this.getActionRisk(params.action);

    if (risk.risk === 'high') {
      return { success: false, result: `Action "${params.action}" requires human confirmation (high risk)` };
    }

    try {
      let result: any;
      switch (params.action) {
        case 'create_task':
          result = await this.prisma.task.create({ data: { ...params.args, leadId: params.leadId } });
          break;
        case 'create_ticket':
          result = await this.prisma.ticket.create({ data: { ...params.args, leadId: params.leadId } });
          break;
        default:
          return { success: false, result: `Unknown autonomous action: ${params.action}` };
      }

      await this.events.emit({
        type: 'jarvis.autonomous_action',
        source: 'jarvis',
        entityType: 'lead',
        entityId: params.leadId,
        payload: { action: params.action, args: params.args, result },
      });

      return { success: true, result: `${params.action} completed: ${JSON.stringify(result).slice(0, 200)}` };
    } catch (err: any) {
      return { success: false, result: `${params.action} failed: ${err.message}` };
    }
  }
}
