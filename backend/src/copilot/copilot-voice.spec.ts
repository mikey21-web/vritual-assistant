import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
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
import { AnalyticsService } from '../analytics/analytics.service';
import { ContactsService } from '../contacts/contacts.service';
import { KhojClientService } from '../khoj-client/khoj-client.service';
import { MikeyService } from '../mikey/mikey.service';
import { OutcomeEngineService } from '../mikey/outcome-engine.service';
import { MemoryService } from '../mikey/memory.service';
import { FederatedService } from '../mikey/federated.service';

jest.mock('openai', () => {
  const mockCreate = jest.fn();
  return {
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: mockCreate,
        },
      },
    })),
    OpenAI: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: mockCreate,
        },
      },
    })),
  };
});

describe('CopilotService — voice command navigation', () => {
  let service: CopilotService;
  let mockOpenAICreate: jest.Mock;

  const mockPrisma = () => ({
    copilotMessage: {
      create: jest.fn().mockResolvedValue({ id: 'msg-1' }),
      count: jest.fn().mockResolvedValue(0),
    },
    copilotConversation: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 'conv-1', messages: [] }),
    },
    businessSettings: {
      findFirst: jest.fn().mockResolvedValue({ businessName: 'TestBiz', industry: 'events' }),
    },
    knowledgeArticle: { findMany: jest.fn().mockResolvedValue([]) },
    featureFlags: { findUnique: jest.fn().mockResolvedValue(null) },
    $disconnect: jest.fn(),
  });

  beforeAll(async () => {
    const OpenAI = require('openai');
    const client = new OpenAI.OpenAI();
    mockOpenAICreate = client.chat.completions.create;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CopilotService,
        { provide: PrismaService, useValue: mockPrisma() },
        { provide: ConfigService, useValue: { get: jest.fn((k: string) => k === 'DEEPSEEK_API_KEY' ? 'sk-test' : undefined) } },
        { provide: LeadsService, useValue: { findAll: jest.fn().mockResolvedValue([]), findOne: jest.fn().mockResolvedValue({ id: 'l1', contact: { name: 'Test' } }), update: jest.fn() } },
        { provide: TasksService, useValue: { create: jest.fn() } },
        { provide: TicketsService, useValue: { create: jest.fn(), findAll: jest.fn().mockResolvedValue([]), update: jest.fn() } },
        { provide: CampaignsService, useValue: { findAll: jest.fn().mockResolvedValue([]), create: jest.fn() } },
        { provide: ConversationsService, useValue: { create: jest.fn() } },
        { provide: ReportsService, useValue: { run: jest.fn() } },
        { provide: CustomFieldsService, useValue: { createDefinition: jest.fn() } },
        { provide: TelephonyService, useValue: { initiateCall: jest.fn() } },
        { provide: EmailAdapter, useValue: { send: jest.fn() } },
        { provide: FeatureFlagsService, useValue: { isEnabledDefault: jest.fn().mockResolvedValue(true) } },
        { provide: AnalyticsService, useValue: {} },
        { provide: ContactsService, useValue: { findAll: jest.fn().mockResolvedValue([]) } },
        { provide: KhojClientService, useValue: { query: jest.fn().mockResolvedValue(null) } },
        { provide: MikeyService, useValue: { runAutonomousAction: jest.fn(), getActionRules: jest.fn().mockReturnValue([]) } },
        { provide: OutcomeEngineService, useValue: { defineOutcome: jest.fn().mockResolvedValue({ id: 'o1', goal: 'test', steps: [] }) } },
        { provide: MemoryService, useValue: { recallRecent: jest.fn().mockResolvedValue([]) } },
        { provide: FederatedService, useValue: { getLocalBenchmarks: jest.fn().mockResolvedValue([]) } },
      ],
    }).compile();
    service = module.get<CopilotService>(CopilotService);
  });

  beforeEach(() => {
    mockOpenAICreate.mockReset();
  });

  it('handles "show me leads" by calling navigate_ui', async () => {
    mockOpenAICreate
      .mockResolvedValueOnce({
        choices: [{
          message: {
            content: null,
            tool_calls: [{
              id: 'call-1',
              type: 'function',
              function: {
                name: 'navigate_ui',
                arguments: JSON.stringify({ page: 'leads', filters: { status: 'HOT' }, summary: 'Here are your leads' }),
              },
            }],
          },
        }],
      })
      .mockResolvedValueOnce({
        choices: [{ message: { content: 'Navigated to leads page with hot leads filter.' } }],
      });

    const result = await service.chat('user-1', 'ADMIN', 'tenant-1', 'show me leads');
    expect(result.actions).toBeDefined();
    expect(result.actions!.length).toBeGreaterThanOrEqual(1);
    const navAction = result.actions!.find((a: any) => a.tool === 'navigate_ui');
    expect(navAction).toBeDefined();
    expect(navAction.args.page).toBe('leads');
    expect(navAction.args.filters.status).toBe('HOT');
  });

  it('handles "show me hot leads" with status filter', async () => {
    mockOpenAICreate
      .mockResolvedValueOnce({
        choices: [{
          message: {
            content: null,
            tool_calls: [{
              id: 'call-1',
              type: 'function',
              function: {
                name: 'navigate_ui',
                arguments: JSON.stringify({ page: 'leads', filters: { status: 'HOT' }, summary: 'Displaying hot leads' }),
              },
            }],
          },
        }],
      })
      .mockResolvedValueOnce({
        choices: [{ message: { content: 'Showing hot leads.' } }],
      });

    const result = await service.chat('user-1', 'ADMIN', 'tenant-1', 'show me hot leads');
    expect(result.actions).toBeDefined();
    const navAction = result.actions!.find((a: any) => a.tool === 'navigate_ui');
    expect(navAction).toBeDefined();
    expect(navAction.args.page).toBe('leads');
  });

  it('handles "navigate to tickets" command', async () => {
    mockOpenAICreate
      .mockResolvedValueOnce({
        choices: [{
          message: {
            content: null,
            tool_calls: [{
              id: 'call-2',
              type: 'function',
              function: {
                name: 'navigate_ui',
                arguments: JSON.stringify({ page: 'tickets', filters: { status: 'OPEN' }, summary: 'Showing open tickets' }),
              },
            }],
          },
        }],
      })
      .mockResolvedValueOnce({
        choices: [{ message: { content: 'Navigated to tickets.' } }],
      });

    const result = await service.chat('user-1', 'ADMIN', 'tenant-1', 'navigate to tickets');
    const navAction = result.actions!.find((a: any) => a.tool === 'navigate_ui');
    expect(navAction).toBeDefined();
    expect(navAction.args.page).toBe('tickets');
  });

  it('returns text reply for non-navigation queries', async () => {
    mockOpenAICreate
      .mockResolvedValueOnce({
        choices: [{
          message: {
            content: 'Your business has 12 hot leads and 3 open tickets.',
            tool_calls: null,
          },
        }],
      });

    const result = await service.chat('user-1', 'ADMIN', 'tenant-1', 'what is my conversion rate');
    expect(result.reply).toBeDefined();
    expect(result.reply.length).toBeGreaterThan(0);
    // No navigation actions for non-nav queries
    const navAction = result.actions!.find((a: any) => a.tool === 'navigate_ui');
    expect(navAction).toBeUndefined();
  });
});
