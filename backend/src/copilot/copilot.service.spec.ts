import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { CopilotService } from './copilot.service';
import { PrismaService } from '../prisma/prisma.service';
import { LeadsService } from '../leads/leads.service';
import { TasksService } from '../tasks/tasks.service';
import { TicketsService } from '../tickets/tickets.service';
import { CampaignsService } from '../campaigns/campaigns.service';
import { ConversationsService } from '../conversations/conversations.service';
import { ReportsService } from '../reports/reports.service';
import { CustomFieldsService } from '../custom-fields/custom-fields.service';
import { TelephonyService } from '../telephony/telephony.service';
import { EmailAdapter } from '../shared/adapters/email.adapter';
import { FeatureFlagsService } from '../shared/feature-flags.service';

function toolCallResponse(name: string, args: any) {
  return {
    choices: [{
      message: {
        content: null,
        tool_calls: [{ id: 'tc_1', type: 'function', function: { name, arguments: JSON.stringify(args) } }],
      },
    }],
  };
}

function textResponse(content: string) {
  return { choices: [{ message: { content, tool_calls: [] } }] };
}

describe('CopilotService', () => {
  let service: CopilotService;
  let prisma: any;
  let leadsService: any;
  let featureFlags: any;
  let mockCreate: jest.Mock;

  const mockConversation = { id: 'conv-1', messages: [] };

  beforeEach(async () => {
    prisma = {
      copilotConversation: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(mockConversation),
      },
      copilotMessage: { create: jest.fn().mockResolvedValue({}), count: jest.fn().mockResolvedValue(0) },
    };
    leadsService = {
      findAll: jest.fn().mockResolvedValue({ data: [{ id: 'lead-1' }], meta: { total: 1 } }),
      update: jest.fn().mockResolvedValue({ id: 'lead-1', status: 'LOST' }),
    };
    featureFlags = { isEnabledDefault: jest.fn().mockResolvedValue(true) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CopilotService,
        { provide: ConfigService, useValue: { get: jest.fn((k: string) => (k === 'DEEPSEEK_API_KEY' ? 'fake-key' : '')) } },
        { provide: PrismaService, useValue: prisma },
        { provide: LeadsService, useValue: leadsService },
        { provide: TasksService, useValue: {} },
        { provide: TicketsService, useValue: {} },
        { provide: CampaignsService, useValue: {} },
        { provide: ConversationsService, useValue: { create: jest.fn() } },
        { provide: ReportsService, useValue: {} },
        { provide: CustomFieldsService, useValue: {} },
        { provide: TelephonyService, useValue: { initiateCall: jest.fn() } },
        { provide: EmailAdapter, useValue: { send: jest.fn() } },
        { provide: FeatureFlagsService, useValue: featureFlags },
      ],
    }).compile();

    service = module.get<CopilotService>(CopilotService);

    // Replace the internally-constructed OpenAI client with a controllable mock —
    // `client` is built from config in the constructor and isn't DI-injectable.
    mockCreate = jest.fn();
    (service as any).client = { chat: { completions: { create: mockCreate } } };
  });

  describe('kill-switch and usage cap guardrails', () => {
    it('refuses to run when the copilot_enabled flag has been explicitly disabled', async () => {
      featureFlags.isEnabledDefault.mockResolvedValue(false);
      await expect(
        service.chat('user-1', 'SALES_AGENT', 'default-tenant', 'show me leads'),
      ).rejects.toThrow('temporarily disabled');
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('defaults to enabled when the flag has never been set (fail open, not closed)', async () => {
      mockCreate.mockResolvedValueOnce(textResponse('ok'));
      await service.chat('user-1', 'SALES_AGENT', 'default-tenant', 'hello');
      expect(featureFlags.isEnabledDefault).toHaveBeenCalledWith('copilot_enabled', true);
      expect(mockCreate).toHaveBeenCalled();
    });

    it('refuses to run once the tenant has hit its daily message cap', async () => {
      prisma.copilotMessage.count.mockResolvedValue(500);
      await expect(
        service.chat('user-1', 'SALES_AGENT', 'default-tenant', 'show me leads'),
      ).rejects.toThrow('daily usage limit');
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('allows the request through when under the daily cap', async () => {
      prisma.copilotMessage.count.mockResolvedValue(499);
      mockCreate.mockResolvedValueOnce(textResponse('ok'));
      await service.chat('user-1', 'SALES_AGENT', 'default-tenant', 'hello');
      expect(mockCreate).toHaveBeenCalled();
    });
  });

  describe('permission enforcement', () => {
    it('refuses a read-only tool the role lacks permission for, without executing it', async () => {
      mockCreate
        .mockResolvedValueOnce(toolCallResponse('search_leads', { status: 'NEW' }))
        .mockResolvedValueOnce(textResponse('You do not have permission for that.'));

      const result = await service.chat('user-1', 'VIEWER_WITHOUT_LEADS', 'default-tenant', 'show me new leads');

      // VIEWER_WITHOUT_LEADS is not a real role in PERMISSION_MATRIX, so `can()` returns false
      expect(leadsService.findAll).not.toHaveBeenCalled();
      expect(result.actions[0].status).toBe('error');
      expect(result.actions[0].result).toContain('do not have permission');
    });

    it('executes a read-only tool immediately when the role has permission', async () => {
      mockCreate
        .mockResolvedValueOnce(toolCallResponse('search_leads', { status: 'NEW' }))
        .mockResolvedValueOnce(textResponse('Found 1 lead.'));

      const result = await service.chat('user-1', 'SALES_AGENT', 'default-tenant', 'show me new leads');

      expect(leadsService.findAll).toHaveBeenCalledWith(expect.objectContaining({ status: 'NEW' }));
      expect(result.actions[0].status).toBe('success');
    });
  });

  describe('high-impact confirmation guardrail', () => {
    it('does not execute a high-impact tool immediately — marks it pending confirmation', async () => {
      mockCreate
        .mockResolvedValueOnce(toolCallResponse('update_lead_status', { leadId: 'lead-1', status: 'LOST' }))
        .mockResolvedValueOnce(textResponse('I will mark this lead as lost, pending your confirmation.'));

      const result = await service.chat('user-1', 'SALES_AGENT', 'default-tenant', 'mark lead-1 as lost');

      expect(leadsService.update).not.toHaveBeenCalled();
      expect(result.actions[0].status).toBe('pending');
      expect(result.actions[0].requiresConfirmation).toBe(true);
      expect(result.actions[0].pendingActionId).toMatch(/^pa_/);
    });

    it('only executes the high-impact tool after confirmAction is called', async () => {
      mockCreate
        .mockResolvedValueOnce(toolCallResponse('update_lead_status', { leadId: 'lead-1', status: 'LOST' }))
        .mockResolvedValueOnce(textResponse('Pending confirmation.'));

      const chatResult = await service.chat('user-1', 'SALES_AGENT', 'default-tenant', 'mark lead-1 as lost');
      const pendingActionId = chatResult.actions[0].pendingActionId;
      expect(pendingActionId).toBeTruthy();

      expect(leadsService.update).not.toHaveBeenCalled();

      await service.confirmAction('user-1', pendingActionId);
      expect(leadsService.update).toHaveBeenCalledWith('lead-1', { status: 'LOST' });
    });
  });

  describe('confirmAction ownership + lifecycle', () => {
    it('throws NotFoundException for an unknown or expired pending action', async () => {
      await expect(service.confirmAction('user-1', 'pa_does_not_exist')).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when a different user tries to confirm someone else\'s pending action', async () => {
      mockCreate
        .mockResolvedValueOnce(toolCallResponse('update_lead_status', { leadId: 'lead-1', status: 'LOST' }))
        .mockResolvedValueOnce(textResponse('Pending confirmation.'));

      const chatResult = await service.chat('user-1', 'SALES_AGENT', 'default-tenant', 'mark lead-1 as lost');
      const pendingActionId = chatResult.actions[0].pendingActionId;

      await expect(service.confirmAction('someone-else', pendingActionId)).rejects.toThrow(ForbiddenException);
    });

    it('removes the pending action after it is confirmed (cannot be double-executed)', async () => {
      mockCreate
        .mockResolvedValueOnce(toolCallResponse('update_lead_status', { leadId: 'lead-1', status: 'LOST' }))
        .mockResolvedValueOnce(textResponse('Pending confirmation.'));

      const chatResult = await service.chat('user-1', 'SALES_AGENT', 'default-tenant', 'mark lead-1 as lost');
      const pendingActionId = chatResult.actions[0].pendingActionId;

      await service.confirmAction('user-1', pendingActionId);
      await expect(service.confirmAction('user-1', pendingActionId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('tool-loop iteration cap', () => {
    it('never calls the model more than maxIterations + 1 times (loop cap + final response)', async () => {
      // Always return a tool call that requires confirmation, so the loop would run forever without a cap.
      mockCreate.mockResolvedValue(toolCallResponse('update_lead_status', { leadId: 'lead-1', status: 'LOST' }));

      await service.chat('user-1', 'SALES_AGENT', 'default-tenant', 'loop forever');

      // A pending action breaks the loop on iteration 1, then one final response call.
      expect(mockCreate.mock.calls.length).toBeLessThanOrEqual(7);
    });
  });
});
