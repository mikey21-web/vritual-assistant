import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppCloudAdapter, TelegramBotAdapter } from '../shared/adapters/messaging.adapter';
import { EmailAdapter } from '../shared/adapters/email.adapter';
import { HubspotAdapter, SalesforceAdapter, ZohoAdapter, CrmAdapter } from '../shared/adapters/crm.adapter';
import { CalendlyAdapter, GoogleCalendarAdapter, CalendarAdapter } from '../shared/adapters/calendar.adapter';
import { ConversationsService } from '../conversations/conversations.service';
import { LeadsService } from '../leads/leads.service';
import { TasksService } from '../tasks/tasks.service';
import { EventsService } from '../events/events.service';
import { evaluateCondition, getNested } from '../shared/scoring.util';

interface StepResult {
  /** Set to true when the full nurture sequence is done (no more steps) */
  completed?: boolean;
  /** If true, the caller should advance progress.stepId to the next step */
  advance?: boolean;
  /** If set, the next step should be scheduled for this time (WAIT steps) */
  scheduleNextAt?: Date;
  /** Target step ID to jump to after a WAIT */
  nextStepId?: string;
  /** Error message if the step failed */
  error?: string;
}

@Injectable()
export class NurtureProcessorService {
  private readonly logger = new Logger(NurtureProcessorService.name);

  constructor(
    private prisma: PrismaService,
    private whatsAppAdapter: WhatsAppCloudAdapter,
    private telegramAdapter: TelegramBotAdapter,
    private emailAdapter: EmailAdapter,
    private hubspotAdapter: HubspotAdapter,
    private salesforceAdapter: SalesforceAdapter,
    private zohoAdapter: ZohoAdapter,
    private calendlyAdapter: CalendlyAdapter,
    private googleCalAdapter: GoogleCalendarAdapter,
    private conversationsService: ConversationsService,
    private leadsService: LeadsService,
    private tasksService: TasksService,
    private events: EventsService,
    private config: ConfigService,
  ) {}

  /**
   * Process the next pending step for a lead in a nurture sequence.
   * @param leadId    Lead to process
   * @param sequenceId Nurture sequence to run
   * @param overrideStepId If provided, process this specific step instead of progress.stepId
   */
  async process(
    leadId: string,
    sequenceId: string,
    overrideStepId?: string,
  ): Promise<{ processed: boolean; completed?: boolean; error?: string }> {
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
      include: { contact: true },
    });
    if (!lead) {
      return { processed: false, error: 'Lead not found' };
    }

    // Find existing progress or create a new one pointing to the first step
    let progress = await this.prisma.nurtureProgress.findFirst({
      where: { leadId, sequenceId },
      orderBy: { createdAt: 'desc' },
    });

    if (!progress) {
      const firstStep = await this.prisma.nurtureStep.findFirst({
        where: { sequenceId },
        orderBy: { displayOrder: 'asc' },
      });
      if (!firstStep) {
        return { processed: false, error: 'Sequence has no steps' };
      }

      progress = await this.prisma.nurtureProgress.create({
        data: {
          leadId,
          sequenceId,
          stepId: firstStep.id,
          status: 'pending',
        },
      });
      this.logger.log(`Created nurture progress ${progress.id} for lead ${leadId} sequence ${sequenceId}`);
    }

    if (progress.status === 'completed') {
      return { processed: true, completed: true };
    }

    if (progress.status === 'failed') {
      // Optionally, allow retry if it's failed - but for now return early
      return { processed: false, error: `Progress is in failed state: ${progress.error}` };
    }

    // Determine which step to execute
    const stepId = overrideStepId || progress.stepId;

    const step = await this.prisma.nurtureStep.findUnique({
      where: { id: stepId },
      include: { template: true },
    });
    if (!step) {
      const message = `Step ${stepId} not found in sequence ${sequenceId}`;
      this.logger.error(message);
      await this.prisma.nurtureProgress.update({
        where: { id: progress.id },
        data: { status: 'failed', error: message },
      });
      return { processed: false, error: message };
    }

    // Mark progress as processing
    await this.prisma.nurtureProgress.update({
      where: { id: progress.id },
      data: { status: 'processing' },
    });

    // Execute the step
    this.logger.log(`Executing nurture step ${step.id} (${step.type}) for lead ${leadId}`);
    const result = await this.executeStep(step, lead, progress, sequenceId);

    if (result.error) {
      this.logger.error(`Step ${step.id} (${step.type}) failed for lead ${leadId}: ${result.error}`);
      await this.prisma.nurtureProgress.update({
        where: { id: progress.id },
        data: {
          status: 'failed',
          error: result.error,
          executedAt: new Date(),
        },
      });
      return { processed: false, error: result.error };
    }

    // Handle step completion and advancement
    if (result.completed) {
      await this.prisma.nurtureProgress.update({
        where: { id: progress.id },
        data: { status: 'completed', executedAt: new Date() },
      });
      this.logger.log(`Nurture sequence ${sequenceId} completed for lead ${leadId}`);
      await this.events.emit({
        type: 'nurture.sequence_completed',
        entityType: 'NurtureProgress',
        entityId: progress.id,
        leadId,
        payload: { sequenceId },
      });
      return { processed: true, completed: true };
    }

    if (result.scheduleNextAt && result.nextStepId) {
      // WAIT step: schedule the next step for later
      await this.prisma.nurtureProgress.update({
        where: { id: progress.id },
        data: {
          stepId: result.nextStepId,
          dueAt: result.scheduleNextAt,
          status: 'pending',
          executedAt: new Date(),
        },
      });
      this.logger.debug(
        `Scheduled next nurture step for lead ${leadId} at ${result.scheduleNextAt.toISOString()}`,
      );
    } else if (result.advance !== false) {
      // Normal advancement to next step
      const nextStep = await this.prisma.nurtureStep.findFirst({
        where: {
          sequenceId,
          displayOrder: { gt: step.displayOrder },
        },
        orderBy: { displayOrder: 'asc' },
      });

      if (nextStep) {
        await this.prisma.nurtureProgress.update({
          where: { id: progress.id },
          data: {
            stepId: nextStep.id,
            status: 'pending',
            executedAt: new Date(),
          },
        });
      } else {
        // No more steps — sequence complete
        await this.prisma.nurtureProgress.update({
          where: { id: progress.id },
          data: { status: 'completed', executedAt: new Date() },
        });
        this.logger.log(`Nurture sequence ${sequenceId} completed for lead ${leadId}`);
        await this.events.emit({
          type: 'nurture.sequence_completed',
          entityType: 'NurtureProgress',
          entityId: progress.id,
          leadId,
          payload: { sequenceId },
        });
        return { processed: true, completed: true };
      }
    }

    await this.events.emit({
      type: 'nurture.step_completed',
      entityType: 'NurtureStep',
      entityId: step.id,
      leadId,
      payload: { sequenceId, stepType: step.type, displayOrder: step.displayOrder },
    });

    return { processed: true };
  }

  // ──────────────────────────────────────────────
  //  Step execution
  // ──────────────────────────────────────────────

  private async executeStep(
    step: any,
    lead: any,
    progress: any,
    sequenceId: string,
  ): Promise<StepResult> {
    switch (step.type) {
      case 'SEND_WHATSAPP':
        return this.sendWhatsApp(step, lead, progress);
      case 'SEND_EMAIL':
        return this.sendEmail(step, lead, progress);
      case 'WAIT':
        return this.handleWait(step, sequenceId);
      case 'CHECK_CONDITION':
        return this.handleCheckCondition(step, lead, sequenceId);
      case 'UPDATE_LEAD_STATUS':
        return this.handleUpdateLeadStatus(step, lead);
      case 'PUSH_TO_CRM':
        return this.handlePushToCrm(step, lead);
      case 'SEND_BOOKING_LINK':
        return this.handleSendBookingLink(step, lead, progress);
      case 'CREATE_TASK':
        return this.handleCreateTask(step, lead, progress);
      case 'SEND_DOCUMENT':
      case 'SEND_IMAGE':
      case 'SEND_DIGITAL_DOWNLOAD':
        return { advance: true };
      case 'NOTIFY_TEAM':
        return { advance: true };
      default:
        this.logger.warn(`Unknown nurture step type: ${step.type} — skipping`);
        return { advance: true };
    }
  }

  // ── SEND_WHATSAPP ──────────────────────────────

  private async sendWhatsApp(
    step: any,
    lead: any,
    _progress: any,
  ): Promise<StepResult> {
    const contact = lead.contact;
    const to = contact?.whatsapp || contact?.phone;
    if (!to) {
      return { error: 'Contact has no WhatsApp number or phone', advance: false };
    }

    let text = '';
    let templateName = '';

    if (step.template) {
      text = this.interpolateTemplate(step.template.body, lead, contact);
      templateName = step.template.name;
    } else {
      text = step.config?.text || '';
    }

    if (!text && !templateName) {
      return { error: 'No message text or template configured', advance: false };
    }

    // Create ConversationMessage for audit trail
    try {
      await this.conversationsService.create({
        text,
        channel: 'WHATSAPP',
        direction: 'OUTBOUND',
        leadId: lead.id,
        contactId: contact?.id,
        messageTemplateId: step.templateId,
      });
    } catch (e: any) {
      // Even if policy blocks, log it as failure but continue
      this.logger.warn(`WhatsApp message blocked by policy for lead ${lead.id}: ${e.message}`);
      return { error: `Policy blocked: ${e.message}`, advance: false };
    }

    // Send via WhatsApp adapter
    const waConfig = {
      phoneNumberId: this.config.get<string>('WHATSAPP_PHONE_NUMBER_ID') || '',
      accessToken: this.config.get<string>('WHATSAPP_ACCESS_TOKEN') || '',
    };

    const result = await this.whatsAppAdapter.sendMessage(to, text, waConfig);
    if (!result.success) {
      this.logger.warn(`WhatsApp send failed for lead ${lead.id}: ${result.error}`);
      return { error: result.error || 'WhatsApp send failed', advance: false };
    }

    this.logger.log(`WhatsApp sent to lead ${lead.id} via nurture step ${step.id}`);
    return { advance: true };
  }

  // ── SEND_EMAIL ──────────────────────────────────

  private async sendEmail(
    step: any,
    lead: any,
    _progress: any,
  ): Promise<StepResult> {
    const contact = lead.contact;
    const to = contact?.email;
    if (!to) {
      return { error: 'Contact has no email address', advance: false };
    }

    const subject = step.config?.subject || 'Message from our team';
    let html = '';

    if (step.template) {
      html = this.interpolateTemplate(step.template.body, lead, contact);
    } else {
      html = step.config?.html || step.config?.text || '';
    }

    if (!html) {
      return { error: 'No email content configured', advance: false };
    }

    // Create ConversationMessage for audit trail
    try {
      await this.conversationsService.create({
        text: html.replace(/<[^>]*>/g, '').substring(0, 500), // plain-text preview
        channel: 'EMAIL',
        direction: 'OUTBOUND',
        leadId: lead.id,
        contactId: contact?.id,
        messageTemplateId: step.templateId,
      });
    } catch (e: any) {
      this.logger.warn(`Email message blocked by policy for lead ${lead.id}: ${e.message}`);
      return { error: `Policy blocked: ${e.message}`, advance: false };
    }

    const result = await this.emailAdapter.send(to, subject, html);
    if (!result.success) {
      this.logger.warn(`Email send failed for lead ${lead.id}: ${result.error}`);
      return { error: result.error || 'Email send failed', advance: false };
    }

    this.logger.log(`Email sent to lead ${lead.id} via nurture step ${step.id}`);
    return { advance: true };
  }

  // ── WAIT ────────────────────────────────────────

  private async handleWait(
    step: any,
    sequenceId: string,
  ): Promise<StepResult> {
    const waitSeconds = step.waitSeconds || 0;
    if (waitSeconds <= 0) {
      // Zero wait — just advance immediately
      return { advance: true };
    }

    // Find the next step after this WAIT
    const nextStep = await this.prisma.nurtureStep.findFirst({
      where: {
        sequenceId,
        displayOrder: { gt: step.displayOrder },
      },
      orderBy: { displayOrder: 'asc' },
    });

    if (!nextStep) {
      // WAIT was the last step — sequence complete
      return { completed: true };
    }

    const dueAt = new Date(Date.now() + waitSeconds * 1000);
    return {
      advance: false,
      scheduleNextAt: dueAt,
      nextStepId: nextStep.id,
    };
  }

  // ── CHECK_CONDITION ────────────────────────────

  private async handleCheckCondition(
    step: any,
    lead: any,
    sequenceId: string,
  ): Promise<StepResult> {
    const condition = step.condition as Record<string, any> | null;
    if (!condition || !condition.field) {
      this.logger.warn(`CHECK_CONDITION step ${step.id} has no condition defined — skipping`);
      return { advance: true };
    }

    const fieldValue = getNested(lead, condition.field);
    const passed = evaluateCondition(fieldValue, condition.operator, condition.value);

    this.logger.debug(
      `CHECK_CONDITION step ${step.id}: field=${condition.field}, operator=${condition.operator}, value=${condition.value}, actual=${fieldValue}, passed=${passed}`,
    );

    if (passed) {
      return { advance: true };
    }

    // Condition failed — skip all remaining steps or jump to configured fallback
    if (condition.onFalse === 'skip_remaining') {
      this.logger.log(`Condition failed on step ${step.id} — skipping remaining steps for lead ${lead.id}`);
      return { completed: true };
    }

    // Default: skip to the next step (i.e. just advance)
    return { advance: true };
  }

  // ── UPDATE_LEAD_STATUS ─────────────────────────

  private async handleUpdateLeadStatus(
    step: any,
    lead: any,
  ): Promise<StepResult> {
    const targetStatus = step.config?.targetStatus;
    if (!targetStatus) {
      return { error: 'UPDATE_LEAD_STATUS step has no targetStatus in config', advance: false };
    }

    try {
      await this.leadsService.update(lead.id, { status: targetStatus });
      this.logger.log(`Lead ${lead.id} status updated to ${targetStatus} via nurture step ${step.id}`);
      return { advance: true };
    } catch (e: any) {
      return { error: `Failed to update lead status: ${e.message}`, advance: false };
    }
  }

  // ── PUSH_TO_CRM ───────────────────────────────

  private async handlePushToCrm(
    step: any,
    lead: any,
  ): Promise<StepResult> {
    const crmType = step.config?.crmType || 'hubspot';
    const mappingId = step.config?.mappingId;

    const mapping = mappingId
      ? await this.prisma.crmMapping.findUnique({ where: { id: mappingId } })
      : await this.prisma.crmMapping.findFirst({
          where: { crmType, active: true },
          orderBy: { createdAt: 'desc' },
        });

    if (!mapping) {
      return { error: `No active CRM mapping found for type ${crmType}`, advance: false };
    }

    // Find the integration that holds credentials
    const integration = await this.prisma.integration.findFirst({
      where: { type: crmType, isActive: true },
    });

    const adapter = this.resolveCrmAdapter(crmType);
    if (!adapter) {
      return { error: `No CRM adapter available for type ${crmType}`, advance: false };
    }

    // Merge integration config into mapping for the adapter
    const mappingWithConfig = {
      ...mapping,
      config: integration?.config || {},
    };

    const result = await adapter.pushLead(lead, mappingWithConfig);
    if (!result.success) {
      return { error: result.error || 'CRM push failed', advance: false };
    }

    this.logger.log(`Lead ${lead.id} pushed to ${crmType}, externalId=${result.externalId}`);

    // Record the external ID on the lead metadata
    if (result.externalId) {
      await this.leadsService.update(lead.id, {
        metadata: { ...(lead.metadata as any), crmExternalId: result.externalId, crmType },
      });
    }

    return { advance: true };
  }

  // ── SEND_BOOKING_LINK ─────────────────────────

  private async handleSendBookingLink(
    step: any,
    lead: any,
    _progress: any,
  ): Promise<StepResult> {
    const contact = lead.contact;

    // Find the first active booking setting
    const bookingSetting = await this.prisma.bookingSetting.findFirst({
      where: { active: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!bookingSetting) {
      return { error: 'No active booking setting found', advance: false };
    }

    const adapter = this.resolveCalendarAdapter(bookingSetting.provider);
    if (!adapter) {
      return { error: `No calendar adapter available for provider ${bookingSetting.provider}`, advance: false };
    }

    const result = await adapter.createBookingLink(bookingSetting, lead);
    if (!result.link) {
      return { error: result.error || 'Booking link creation failed', advance: false };
    }

    // Send the booking link via the configured or preferred channel
    const channel = (step.config?.channel || contact?.preferredChannel || 'WHATSAPP').toUpperCase();
    const messageText = step.config?.message || `Book a time with us here: ${result.link}`;

    if (channel === 'WHATSAPP' || channel === 'TELEGRAM') {
      const to = contact?.whatsapp || contact?.phone;
      if (!to) return { error: 'Contact has no phone/WhatsApp number', advance: false };

      const adapter = channel === 'TELEGRAM'
        ? this.telegramAdapter
        : this.whatsAppAdapter;

      const sendConfig = channel === 'TELEGRAM'
        ? { botToken: this.config.get<string>('TELEGRAM_BOT_TOKEN') }
        : {
            phoneNumberId: this.config.get<string>('WHATSAPP_PHONE_NUMBER_ID') || '',
            accessToken: this.config.get<string>('WHATSAPP_ACCESS_TOKEN') || '',
          };

      const sendResult = await adapter.sendMessage(to, messageText, sendConfig);
      if (!sendResult.success) {
        return { error: sendResult.error || 'Failed to send booking link', advance: false };
      }
    } else if (channel === 'EMAIL') {
      if (!contact?.email) return { error: 'Contact has no email', advance: false };
      const emailResult = await this.emailAdapter.send(
        contact.email,
        step.config?.subject || 'Book a time with us',
        `<p>${messageText}</p>`,
      );
      if (!emailResult.success) {
        return { error: emailResult.error || 'Failed to email booking link', advance: false };
      }
    }

    this.logger.log(`Booking link sent to lead ${lead.id} via ${channel}`);
    return { advance: true };
  }

  // ── CREATE_TASK ─────────────────────────────────

  private async handleCreateTask(
    step: any,
    lead: any,
    _progress: any,
  ): Promise<StepResult> {
    const config = step.config || {};
    const title = config.title || `Follow-up: ${lead.contact?.name || lead.id}`;
    const description = config.description || `Auto-created by nurture step ${step.id}`;
    const priority = config.priority || 'medium';
    const assigneeId = config.assigneeId || lead.assignedAgentId;
    const dueAt = config.dueAt ? new Date(config.dueAt) : undefined;

    try {
      await this.tasksService.create({
        title,
        description,
        priority,
        leadId: lead.id,
        assigneeId,
        dueAt,
        status: 'pending',
      });
      this.logger.log(`Task created for lead ${lead.id} via nurture step ${step.id}`);
      return { advance: true };
    } catch (e: any) {
      return { error: `Failed to create task: ${e.message}`, advance: false };
    }
  }

  // ── Helpers ─────────────────────────────────────

  private interpolateTemplate(template: string, lead: any, contact: any): string {
    const context = { ...lead, contact: { ...contact } };
    return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (_, path: string) => {
      const value = getNested(context, path);
      return value != null ? String(value) : '';
    });
  }

  private resolveCrmAdapter(crmType: string): CrmAdapter | null {
    switch (crmType) {
      case 'hubspot':
        return this.hubspotAdapter;
      case 'salesforce':
        return this.salesforceAdapter;
      case 'zoho':
        return this.zohoAdapter;
      default:
        return null;
    }
  }

  private resolveCalendarAdapter(provider: string): CalendarAdapter | null {
    switch (provider) {
      case 'calendly':
        return this.calendlyAdapter;
      case 'google':
        return this.googleCalAdapter;
      default:
        return null;
    }
  }
}
