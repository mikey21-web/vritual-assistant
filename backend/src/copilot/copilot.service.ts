import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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

const MAX_COPILOT_MESSAGES_PER_TENANT_PER_DAY = 500;
import { PERMISSION_MATRIX } from '../permissions/permissions.matrix';
import OpenAI from 'openai';

interface PendingAction {
  id: string;
  userId: string;
  tool: string;
  args: any;
  createdAt: number;
}

@Injectable()
export class CopilotService {
  private readonly logger = new Logger(CopilotService.name);
  private pendingActions = new Map<string, PendingAction>();
  private client: OpenAI;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
    private leadsService: LeadsService,
    private tasksService: TasksService,
    private ticketsService: TicketsService,
    private campaignsService: CampaignsService,
    private conversationsService: ConversationsService,
    private reportsService: ReportsService,
    private customFieldsService: CustomFieldsService,
    private telephonyService: TelephonyService,
    private emailAdapter: EmailAdapter,
    private featureFlags: FeatureFlagsService,
  ) {
    const apiKey = this.config.get<string>('DEEPSEEK_API_KEY');
    const baseURL = this.config.get<string>('DEEPSEEK_BASE_URL') || 'https://api.deepseek.com/v1';
    if (apiKey) {
      this.client = new OpenAI({ apiKey, baseURL });
    }
  }

  private can(role: string, permission: string): boolean {
    const roles = PERMISSION_MATRIX[permission];
    return roles?.includes(role) ?? false;
  }

  async chat(userId: string, userRole: string, tenantId: string, message: string, conversationId?: string) {
    if (!this.client) throw new Error('Copilot not configured: DEEPSEEK_API_KEY missing');

    const enabled = await this.featureFlags.isEnabledDefault('copilot_enabled', true);
    if (!enabled) {
      throw new Error('The Copilot has been temporarily disabled by an administrator.');
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const messagesToday = await this.prisma.copilotMessage.count({
      where: { role: 'user', createdAt: { gte: startOfDay }, conversation: { tenantId } },
    });
    if (messagesToday >= MAX_COPILOT_MESSAGES_PER_TENANT_PER_DAY) {
      throw new Error('The Copilot has reached its daily usage limit for this account. Please try again tomorrow.');
    }

    let conversation = conversationId
      ? await this.prisma.copilotConversation.findUnique({ where: { id: conversationId }, include: { messages: { orderBy: { createdAt: 'asc' } } } })
      : null;

    if (!conversation) {
      conversation = await this.prisma.copilotConversation.create({
        data: { tenantId, userId, title: message.slice(0, 80) },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      });
    }

    const systemPrompt = `You are Mikey, a friendly and proactive AI CRM assistant. You help staff manage leads, tickets, tasks, campaigns, and more. You're knowledgeable, efficient, and always ready to help. Talk naturally and conversationally. When someone greets you, greet them back warmly.

You have access to the following tools:
- search_leads: Search leads by status, segment, assignedAgentId, search text
- get_lead_detail: Get full detail on a specific lead
- update_lead_status: Change a lead's status (high impact — requires confirmation)
- create_task: Create a task for a lead
- create_ticket: Create a support ticket
- draft_message: Suggest a message text for a lead (does NOT send)
- send_message: Send a message to a lead via a channel (high impact — requires confirmation)
- list_tickets: List support tickets with filters
- list_campaigns: List campaigns
- get_analytics_overview: Get CRM analytics summary
- create_campaign: Create a campaign (high impact — requires confirmation)
- run_report: Run a saved report or inline report query
- update_ticket: Change ticket status/priority/assignee (high impact — requires confirmation)
- initiate_call: Start an outbound call to a lead/contact (high impact — requires confirmation)
- send_email: Send an email to a lead (high impact — requires confirmation)
- create_custom_field: Create a new custom field definition

Rules:
1. For high-impact tools (marked above), set requiresConfirmation: true and do NOT execute — just return what you would do.
2. For read-only tools, execute immediately.
3. If the user lacks permission for a tool, return an error message explaining they don't have permission.
4. Be concise and helpful. Use the tool results to answer the user's question.`;

    const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
      {
        type: 'function',
        function: {
          name: 'search_leads',
          description: 'Search leads with filters',
          parameters: {
            type: 'object',
            properties: {
              status: { type: 'string', enum: ['NEW', 'CONTACTED', 'ENGAGED', 'QUALIFYING', 'QUALIFIED', 'PROPOSAL_SENT', 'APPOINTMENT_BOOKED', 'CONVERTED', 'LOST', 'COLD', 'SPAM'] },
              segment: { type: 'string', enum: ['HOT', 'WARM', 'COLD', 'UNQUALIFIED'] },
              assignedAgentId: { type: 'string' },
              search: { type: 'string' },
            },
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'get_lead_detail',
          description: 'Get detailed info on a lead by ID',
          parameters: { type: 'object', properties: { leadId: { type: 'string' } }, required: ['leadId'] },
        },
      },
      {
        type: 'function',
        function: {
          name: 'update_lead_status',
          description: 'Change lead status (high impact)',
          parameters: {
            type: 'object', properties: {
              leadId: { type: 'string' },
              status: { type: 'string', enum: ['NEW', 'CONTACTED', 'ENGAGED', 'QUALIFYING', 'QUALIFIED', 'PROPOSAL_SENT', 'APPOINTMENT_BOOKED', 'CONVERTED', 'LOST', 'COLD', 'SPAM'] },
            }, required: ['leadId', 'status'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'create_task',
          description: 'Create a task for a lead',
          parameters: {
            type: 'object', properties: {
              leadId: { type: 'string' },
              title: { type: 'string' },
              description: { type: 'string' },
              priority: { type: 'integer', description: '1-5' },
              dueAt: { type: 'string', description: 'ISO date string' },
            }, required: ['leadId', 'title'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'create_ticket',
          description: 'Create a support ticket',
          parameters: {
            type: 'object', properties: {
              subject: { type: 'string' },
              description: { type: 'string' },
              leadId: { type: 'string' },
              priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] },
            }, required: ['subject', 'description'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'draft_message',
          description: 'Draft a message for a lead (does NOT send)',
          parameters: {
            type: 'object', properties: {
              leadId: { type: 'string' },
              instructions: { type: 'string', description: 'What the message should say' },
            }, required: ['leadId', 'instructions'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'send_message',
          description: 'Send a message to a lead (high impact — requires confirmation)',
          parameters: {
            type: 'object', properties: {
              leadId: { type: 'string' },
              channel: { type: 'string', enum: ['WHATSAPP', 'EMAIL', 'SMS'] },
              text: { type: 'string' },
            }, required: ['leadId', 'channel', 'text'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'list_tickets',
          description: 'List support tickets with optional filters',
          parameters: {
            type: 'object', properties: {
              status: { type: 'string', enum: ['OPEN', 'IN_PROGRESS', 'WAITING_ON_CUSTOMER', 'RESOLVED', 'CLOSED'] },
              priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] },
            },
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'list_campaigns',
          description: 'List campaigns',
          parameters: { type: 'object', properties: { status: { type: 'string' } } },
        },
      },
      {
        type: 'function',
        function: {
          name: 'get_analytics_overview',
          description: 'Get CRM analytics overview',
          parameters: { type: 'object', properties: {} },
        },
      },
      {
        type: 'function',
        function: {
          name: 'create_campaign',
          description: 'Create a campaign (high impact)',
          parameters: {
            type: 'object', properties: {
              name: { type: 'string' },
              type: { type: 'string' },
              description: { type: 'string' },
            }, required: ['name'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'run_report',
          description: 'Run a report with entity, metric, groupBy, filters',
          parameters: {
            type: 'object', properties: {
              entity: { type: 'string', enum: ['lead', 'ticket', 'task', 'conversation'] },
              metric: { type: 'string', enum: ['count', 'sum', 'avg'] },
              field: { type: 'string' },
              groupBy: { type: 'string' },
              filters: { type: 'object' },
              chartType: { type: 'string', enum: ['bar', 'line', 'pie'] },
            }, required: ['entity', 'metric'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'update_ticket',
          description: 'Update ticket status, priority, or assignee (high impact)',
          parameters: {
            type: 'object', properties: {
              ticketId: { type: 'string' },
              status: { type: 'string', enum: ['OPEN', 'IN_PROGRESS', 'WAITING_ON_CUSTOMER', 'RESOLVED', 'CLOSED'] },
              priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] },
              assignedToId: { type: 'string' },
            }, required: ['ticketId'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'initiate_call',
          description: 'Initiate an outbound call to a lead (high impact)',
          parameters: {
            type: 'object', properties: {
              leadId: { type: 'string' },
            }, required: ['leadId'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'send_email',
          description: 'Send an email to a lead (high impact)',
          parameters: {
            type: 'object', properties: {
              leadId: { type: 'string' },
              to: { type: 'string' },
              subject: { type: 'string' },
              body: { type: 'string' },
            }, required: ['to', 'subject', 'body'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'create_custom_field',
          description: 'Create a new custom field definition',
          parameters: {
            type: 'object', properties: {
              name: { type: 'string' },
              type: { type: 'string', enum: ['TEXT', 'NUMBER', 'BOOLEAN', 'DATE', 'SELECT', 'MULTI_SELECT'] },
              target: { type: 'string', enum: ['LEAD', 'TICKET'] },
              options: { type: 'array', items: { type: 'string' }, description: 'Required for SELECT/MULTI_SELECT types' },
            }, required: ['name', 'type', 'target'],
          },
        },
      },
    ];

    const highImpactTools = ['update_lead_status', 'send_message', 'create_campaign', 'update_ticket', 'initiate_call', 'send_email'];

    const messages: any[] = [
      { role: 'system', content: systemPrompt },
      ...conversation.messages.map(m => {
        const base: any = { role: m.role, content: m.content };
        if (m.role === 'tool') base.tool_call_id = `tc_${m.id}`;
        return base;
      }),
      { role: 'user', content: message },
    ];

    await this.prisma.copilotMessage.create({
      data: { conversationId: conversation.id, role: 'user', content: message },
    });

    const actions: any[] = [];
    let iterations = 0;
    const maxIterations = 6;

    while (iterations < maxIterations) {
      iterations++;
      const response = await this.client.chat.completions.create({
        model: 'deepseek-chat',
        messages,
        tools,
        tool_choice: 'auto',
      });

      const choice = response.choices[0];
      const replyMsg = choice.message;

      if (!replyMsg.tool_calls || replyMsg.tool_calls.length === 0) {
        const reply = replyMsg.content || 'I have no additional information.';
        await this.prisma.copilotMessage.create({
          data: { conversationId: conversation.id, role: 'assistant', content: reply, toolCalls: actions.length > 0 ? actions : undefined },
        });
        return { conversationId: conversation.id, reply, actions };
      }

      for (const tc of replyMsg.tool_calls) {
        const toolCall = tc as any;
        const toolName = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments);

        const toolPermMap: Record<string, string> = {
          search_leads: 'leads:read',
          get_lead_detail: 'leads:read',
          update_lead_status: 'leads:write',
          create_task: 'tasks:write',
          create_ticket: 'tickets:write',
          draft_message: 'conversations:read',
          send_message: 'conversations:write',
          list_tickets: 'tickets:read',
          list_campaigns: 'campaigns:read',
          get_analytics_overview: 'analytics:read',
          create_campaign: 'campaigns:write',
          run_report: 'reports:run',
          update_ticket: 'tickets:write',
          initiate_call: 'telephony:call',
          send_email: 'conversations:write',
          create_custom_field: 'custom_fields:write',
        };

        const perm = toolPermMap[toolName];
        if (perm && !this.can(userRole, perm)) {
          const result = `error: you do not have permission to do this (requires ${perm})`;
          messages.push({ role: 'assistant', content: null, tool_calls: [{ id: toolCall.id, type: 'function', function: { name: toolName, arguments: JSON.stringify(args) } }] });
          messages.push({ role: 'tool', tool_call_id: toolCall.id, content: result });
          actions.push({ tool: toolName, args, status: 'error', result });
          continue;
        }

        const isHighImpact = highImpactTools.includes(toolName);

        if (isHighImpact) {
          const paId = `pa_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
          this.pendingActions.set(paId, { id: paId, userId, tool: toolName, args, createdAt: Date.now() });
          setTimeout(() => this.pendingActions.delete(paId), 5 * 60 * 1000);
          const result = `pending confirmation (action id: ${paId})`;
          messages.push({ role: 'assistant', content: null, tool_calls: [{ id: toolCall.id, type: 'function', function: { name: toolName, arguments: JSON.stringify(args) } }] });
          messages.push({ role: 'tool', tool_call_id: toolCall.id, content: JSON.stringify({ requiresConfirmation: true, pendingActionId: paId, tool: toolName, args }) });
          actions.push({ tool: toolName, args, status: 'pending', requiresConfirmation: true, pendingActionId: paId });
        } else {
        try {
          let result: any;
          switch (toolName) {
            case 'search_leads':
              result = await this.leadsService.findAll(args);
              break;
            case 'get_lead_detail':
              result = await this.leadsService.findOne(args.leadId);
              break;
            case 'create_task':
              result = await this.tasksService.create({ ...args, tenantId });
              break;
            case 'create_ticket':
              result = await this.ticketsService.create(args, userId);
              break;
            case 'draft_message':
              const lead = await this.leadsService.findOne(args.leadId);
              result = { suggestedMessage: `[Draft for ${lead.contact?.name || 'lead'}]: ${args.instructions}` };
              break;
            case 'list_tickets':
              result = await this.ticketsService.findAll(args);
              break;
            case 'list_campaigns':
              result = await this.campaignsService.findAll(args);
              break;
            case 'get_analytics_overview':
              result = { overview: 'CRM analytics summary', ...(await this.leadsService.findAll({ limit: 1 }).catch(() => ({}))) };
              break;
            case 'run_report':
              result = await this.reportsService.run(
                { entity: args.entity, metric: args.metric, groupBy: args.groupBy, filters: args.filters },
                tenantId,
              );
              break;
            case 'create_custom_field':
              result = await this.customFieldsService.createDefinition({ ...args, tenantId });
              break;
            default:
              result = `unknown tool: ${toolName}`;
          }
            const resultStr = typeof result === 'string' ? result : JSON.stringify(result).slice(0, 3000);
            messages.push({ role: 'assistant', content: null, tool_calls: [{ id: toolCall.id, type: 'function', function: { name: toolName, arguments: JSON.stringify(args) } }] });
            messages.push({ role: 'tool', tool_call_id: toolCall.id, content: resultStr });
            actions.push({ tool: toolName, args, status: 'success', result: resultStr.slice(0, 200) });
          } catch (err: any) {
            const errMsg = err.message || 'Unknown error';
            messages.push({ role: 'assistant', content: null, tool_calls: [{ id: toolCall.id, type: 'function', function: { name: toolName, arguments: JSON.stringify(args) } }] });
            messages.push({ role: 'tool', tool_call_id: toolCall.id, content: `error: ${errMsg}` });
            actions.push({ tool: toolName, args, status: 'error', result: errMsg });
          }
        }
      }

      if (actions.some(a => a.status === 'pending')) break;
    }

    const finalResponse = await this.client.chat.completions.create({
      model: 'deepseek-chat',
      messages,
    });

    const reply = finalResponse.choices[0].message.content || 'Done.';
    await this.prisma.copilotMessage.create({
      data: { conversationId: conversation.id, role: 'assistant', content: reply, toolCalls: actions },
    });

    return { conversationId: conversation.id, reply, actions };
  }

  async confirmAction(userId: string, pendingActionId: string) {
    const action = this.pendingActions.get(pendingActionId);
    if (!action) throw new NotFoundException('Pending action not found or expired');
    if (action.userId !== userId) throw new ForbiddenException('This action belongs to another user');

    let result: any;
    switch (action.tool) {
      case 'update_lead_status':
        result = await this.leadsService.update(action.args.leadId, { status: action.args.status });
        break;
      case 'send_message': {
        result = await this.conversationsService.create({
          leadId: action.args.leadId,
          channel: action.args.channel,
          text: action.args.text,
          direction: 'OUTBOUND',
        }, userId);
        break;
      }
      case 'create_campaign':
        result = await this.campaignsService.create(action.args);
        break;
      case 'update_ticket':
        const { ticketId, ...ticketUpdates } = action.args;
        result = await this.ticketsService.update(ticketId, ticketUpdates, userId);
        break;
      case 'initiate_call': {
        result = await this.telephonyService.initiateCall(action.args.leadId, userId);
        break;
      }
      case 'send_email': {
        result = await this.emailAdapter.send(action.args.to, action.args.subject, action.args.body);
        break;
      }
      default:
        throw new Error(`Unknown tool: ${action.tool}`);
    }

    this.pendingActions.delete(pendingActionId);
    return { status: 'success', result, tool: action.tool, args: action.args };
  }

  async getConversations(userId: string) {
    return this.prisma.copilotConversation.findMany({
      where: { userId }, orderBy: { updatedAt: 'desc' }, select: { id: true, title: true, updatedAt: true, createdAt: true },
    });
  }

  async getConversation(id: string, userId: string) {
    const conv = await this.prisma.copilotConversation.findUnique({
      where: { id }, include: { messages: { orderBy: { createdAt: 'asc' }, select: { id: true, role: true, content: true, toolCalls: true, createdAt: true } } },
    });
    if (!conv) throw new NotFoundException('Conversation not found');
    if (conv.userId !== userId) throw new ForbiddenException();
    return conv;
  }
}
