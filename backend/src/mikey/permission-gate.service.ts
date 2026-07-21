import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { MessagePolicyService } from '../conversations/message-policy.service';

export type ActionRisk = 'LOW' | 'MEDIUM' | 'HIGH';
export type GateVerdict = 'ALLOW' | 'REQUIRE_APPROVAL' | 'BLOCK' | 'RESCHEDULE';

export interface GateResult {
  verdict: GateVerdict;
  reason?: string;
  rescheduleAt?: Date;
  requiresTemplate?: boolean;
}

const ACTION_RISK_MAP: Record<string, ActionRisk> = {
  whatsapp_reply: 'LOW',
  whatsapp_template: 'LOW',
  sms_reminder: 'LOW',
  email_followup: 'MEDIUM',
  outbound_call: 'MEDIUM',
  site_visit_request: 'MEDIUM',
  brochure_send: 'LOW',
  discount_offer: 'HIGH',
  payment_request: 'HIGH',
  legal_docs: 'HIGH',
  campaign_broadcast: 'HIGH',
  assign_agent: 'MEDIUM',
  cost_sheet: 'MEDIUM',
};

@Injectable()
export class PermissionGateService {
  private readonly logger = new Logger(PermissionGateService.name);

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
    private messagePolicy: MessagePolicyService,
  ) {}

  async evaluate(
    leadId: string,
    actionType: string,
    channel: string,
    payload?: { text?: string; templateId?: string },
  ): Promise<GateResult> {
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
      include: { tenant: { select: { settings: true } }, contact: { select: { optedOutAt: true, consentStatus: true } } },
    });
    if (!lead) return { verdict: 'BLOCK', reason: 'Lead not found' };

    const tenantSettings = (lead.tenant?.settings || {}) as any;
    const autonomyMode = tenantSettings.mikeyAutonomy || 'full';
    const riskLevel = ACTION_RISK_MAP[actionType] || 'MEDIUM';

    // 1. Autonomy mode check
    if (autonomyMode === 'observe') {
      return { verdict: 'REQUIRE_APPROVAL', reason: `Observe mode: ${actionType} needs approval` };
    }
    if (autonomyMode === 'approval') {
      return { verdict: 'REQUIRE_APPROVAL', reason: `Approval mode: ${actionType} needs owner to approve` };
    }
    if (autonomyMode === 'limited' && riskLevel === 'HIGH') {
      return { verdict: 'REQUIRE_APPROVAL', reason: `High-risk action (${actionType}) needs approval` };
    }
    if (autonomyMode === 'full' && riskLevel === 'HIGH') {
      if (tenantSettings.requireApprovalForHighRisk) {
        return { verdict: 'REQUIRE_APPROVAL', reason: `High-risk action (${actionType}) flagged for approval` };
      }
    }

    // 2. Channel policy check (runs only for message/call channels)
    if (['WHATSAPP', 'SMS', 'EMAIL', 'TELEGRAM'].includes(channel)) {
      const lastInbound = await this.prisma.conversationMessage.findFirst({
        where: { leadId, direction: 'INBOUND' },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      });
      const isProactive = !lastInbound || (Date.now() - new Date(lastInbound.createdAt).getTime()) > 86400000;

      const policyResult = await this.messagePolicy.evaluate(leadId, channel, payload?.text || '', {
        isProactive,
        templateId: payload?.templateId,
      });

      if (!policyResult.allowed) {
        return {
          verdict: policyResult.action === 'reschedule' ? 'RESCHEDULE' : 'BLOCK',
          reason: policyResult.reason,
          rescheduleAt: policyResult.rescheduleAt,
          requiresTemplate: policyResult.requiresTemplate,
        };
      }
    }

    // 3. Call-specific cooldown — calls don't write a ConversationMessage row (they
    // write CallLog), so without this a lead whose outcome doesn't change segment/intent
    // could get auto-redialed back-to-back every time handleCallWebhook re-enters
    // onLeadCreated. Minimum gap between auto-calls to the same lead.
    if (actionType === 'outbound_call') {
      const cooldownHours = tenantSettings.autoCallCooldownHours ?? 4;
      const since = new Date(Date.now() - cooldownHours * 3600000);
      const recentCall = await this.prisma.callLog.findFirst({
        where: { leadId, direction: 'OUTBOUND', createdAt: { gte: since } },
        select: { id: true },
      });
      if (recentCall) {
        return { verdict: 'BLOCK', reason: `Already called this lead within the last ${cooldownHours}h` };
      }
    }

    // 4. Daily action limit (messages + calls combined)
    const maxActions = tenantSettings.maxActionsPerLead || 20;
    if (maxActions > 0) {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const [messageCount, callCount] = await Promise.all([
        this.prisma.conversationMessage.count({ where: { leadId, direction: 'OUTBOUND', createdAt: { gte: today } } }),
        this.prisma.callLog.count({ where: { leadId, direction: 'OUTBOUND', createdAt: { gte: today } } }),
      ]);
      if (messageCount + callCount >= maxActions) {
        return { verdict: 'BLOCK', reason: `Daily action limit (${maxActions}) reached` };
      }
    }

    return { verdict: 'ALLOW' };
  }
}
