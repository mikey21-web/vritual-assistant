import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SiteVisitsService } from '../site-visits/site-visits.service';
import { UnitHoldsService } from '../unit-holds/unit-holds.service';
import { CostSheetsService } from '../cost-sheets/cost-sheets.service';
import { OffersService } from '../offers/offers.service';
import { DocumentsService } from '../documents/documents.service';
import { ChannelPartnerClaimsService } from '../channel-partner-claims/channel-partner-claims.service';
import { TicketsService } from '../tickets/tickets.service';
import { ApprovalsService } from '../approvals/approvals.service';
import { AutonomousActionService } from './autonomous-action.service';
import { AutonomyGuardrailsService } from './autonomy-guardrails.service';

export type JarvisToolResult =
  | { status: 'COMPLETED'; data: unknown }
  | { status: 'BLOCKED_BY_POLICY'; reason: string }
  | { status: 'FAILED_RETRYABLE'; error: string }
  | { status: 'FAILED_FINAL'; error: string };

/**
 * Narrowly-scoped, typed tools Jarvis/Mikey may call on its own (spec 56.6) —
 * no broad database access, no arbitrary HTTP. Each tool delegates to the
 * same already-tested service a human-driven API route uses, so a Jarvis
 * action and a staff action go through identical validation/transactions/
 * audit trails. Every call is gated by AutonomyGuardrailsService and logged
 * to AutonomousActionService regardless of outcome.
 */
@Injectable()
export class JarvisToolsService {
  private readonly logger = new Logger(JarvisToolsService.name);

  constructor(
    private prisma: PrismaService,
    private siteVisits: SiteVisitsService,
    private unitHolds: UnitHoldsService,
    private costSheets: CostSheetsService,
    private offers: OffersService,
    private documents: DocumentsService,
    private partnerClaims: ChannelPartnerClaimsService,
    private tickets: TicketsService,
    private approvals: ApprovalsService,
    private autonomousActions: AutonomousActionService,
    private guardrails: AutonomyGuardrailsService,
  ) {}

  async createSiteVisit(tenantId: string, args: { leadId: string; projectId: string; unitId?: string; startAt: string }): Promise<JarvisToolResult> {
    return this.run(tenantId, 'create_site_visit', args.leadId, async () => {
      const visit = await this.siteVisits.create({ tenantId, leadId: args.leadId, projectId: args.projectId, unitId: args.unitId, startAt: new Date(args.startAt) });
      return { visitId: visit.id };
    });
  }

  async confirmSiteVisit(tenantId: string, args: { siteVisitId: string }): Promise<JarvisToolResult> {
    return this.run(tenantId, 'confirm_site_visit', undefined, async () => {
      const visit = await this.siteVisits.confirm(tenantId, args.siteVisitId);
      return { visitId: visit.id, status: visit.status };
    });
  }

  async holdUnit(tenantId: string, args: { unitId: string; leadId: string; holdHours?: number }): Promise<JarvisToolResult> {
    return this.run(tenantId, 'hold_unit', args.leadId, async () => {
      const hold = await this.unitHolds.requestHold({ tenantId, unitId: args.unitId, leadId: args.leadId, holdHours: args.holdHours });
      return { holdId: hold.id, expiresAt: hold.expiresAt };
    });
  }

  async releaseHold(tenantId: string, args: { unitHoldId: string; reason?: string }): Promise<JarvisToolResult> {
    return this.run(tenantId, 'release_hold', undefined, async () => {
      const hold = await this.unitHolds.release(tenantId, args.unitHoldId, args.reason || 'Released by Jarvis');
      return { holdId: hold.id, status: hold.status };
    });
  }

  async generateCostSheet(tenantId: string, args: { leadId: string; unitId: string; projectId: string }): Promise<JarvisToolResult> {
    return this.run(tenantId, 'generate_cost_sheet', args.leadId, async () => {
      const sheet = await this.costSheets.create({ tenantId, leadId: args.leadId, unitId: args.unitId, projectId: args.projectId });
      return { costSheetId: sheet.id, totalPaise: sheet.totalPaise };
    });
  }

  /** Never approves its own request — this only creates the request; a human decides (spec 56.4 always-human-only: discount approval). */
  async requestDiscountApproval(tenantId: string, args: { costSheetId: string; discountPaise?: number; discountPercent?: number; reason: string }): Promise<JarvisToolResult> {
    return this.run(tenantId, 'request_discount_approval', undefined, async () => {
      const offer = await this.offers.request(tenantId, { costSheetId: args.costSheetId, discountPaise: args.discountPaise, discountPercent: args.discountPercent, reason: args.reason });
      return { offerId: offer.id };
    });
  }

  async createDemandLetter(tenantId: string, args: { paymentScheduleId: string }): Promise<JarvisToolResult> {
    return this.run(tenantId, 'create_demand_letter', undefined, async () => {
      const doc = await this.documents.generateDemandLetter(tenantId, args.paymentScheduleId);
      return { generatedDocumentId: doc.id };
    });
  }

  /** Never sends a message itself — creates the human follow-up task (spec 56.4: AI may not message a buyer without configured automation approval). */
  async sendPaymentReminder(tenantId: string, args: { leadId: string; paymentScheduleId: string; reason?: string }): Promise<JarvisToolResult> {
    return this.run(tenantId, 'send_payment_reminder', args.leadId, async () => {
      const task = await this.prisma.task.create({
        data: {
          title: `Send payment reminder`,
          description: args.reason || 'Payment milestone is due or overdue',
          leadId: args.leadId,
          createdBy: 'jarvis',
          source: 'jarvis_payment_reminder',
        },
      });
      return { taskId: task.id };
    });
  }

  async createCustomerTicket(tenantId: string, args: { leadId: string; subject: string; description: string; priority?: string }): Promise<JarvisToolResult> {
    return this.run(tenantId, 'create_customer_ticket', args.leadId, async () => {
      const ticket = await this.tickets.create({ subject: args.subject, description: args.description, leadId: args.leadId, priority: (args.priority as any) || 'MEDIUM' } as any, 'jarvis');
      return { ticketId: ticket.id };
    });
  }

  async createPartnerLeadRegistration(tenantId: string, args: { channelPartnerId: string; phone: string; leadId?: string }): Promise<JarvisToolResult> {
    return this.run(tenantId, 'create_partner_lead_registration', args.leadId, async () => {
      const claim = await this.partnerClaims.registerClaim(tenantId, args);
      return { claimId: claim.id, status: claim.status };
    });
  }

  /** Shared envelope: policy gate -> execute -> record outcome (spec 56.6's structured result states). */
  private async run(
    tenantId: string,
    tool: string,
    leadId: string | undefined,
    execute: () => Promise<Record<string, unknown>>,
  ): Promise<JarvisToolResult> {
    const gate = await this.guardrails.canActInternally(tenantId, 'jarvis_tools');
    if (!gate.allowed) {
      await this.autonomousActions.record({ tenantId, findingType: tool, tool, leadId, result: `BLOCKED_BY_POLICY: ${gate.reason}` });
      return { status: 'BLOCKED_BY_POLICY', reason: gate.reason! };
    }

    if (gate.mode === 'observe') {
      await this.approvals.request(tenantId, {
        type: `mikey_${tool}`,
        entityType: leadId ? 'lead' : 'tool',
        entityId: leadId || tool,
        reason: `[DRAFT] ${tool} — waiting for owner approval`,
        requestedById: undefined,
      });
      await this.autonomousActions.record({ tenantId, findingType: tool, tool, leadId, result: 'DRAFTED_FOR_APPROVAL' });
      return { status: 'BLOCKED_BY_POLICY', reason: `${tool} is in observe-only mode — drafted for approval` };
    }

    try {
      const data = await execute();
      await this.autonomousActions.record({ tenantId, findingType: tool, tool, leadId, args: data as any, result: 'COMPLETED' });
      return { status: 'COMPLETED', data };
    } catch (err: any) {
      this.logger.error(`Jarvis tool ${tool} failed: ${err.message}`);
      await this.autonomousActions.record({ tenantId, findingType: tool, tool, leadId, result: `FAILED: ${err.message}` });
      return { status: 'FAILED_FINAL', error: err.message };
    }
  }
}
