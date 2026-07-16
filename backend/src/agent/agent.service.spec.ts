import { Test, TestingModule } from '@nestjs/testing';
import { AgentService } from './agent.service';
import { PrismaService } from '../prisma/prisma.service';
import { EventsService } from '../events/events.service';
import { TimelineService } from '../timeline/timeline.service';
import { AgentClientService } from './agent-client.service';
import { KhojClientService } from '../khoj-client/khoj-client.service';

describe('AgentService', () => {
  let service: AgentService;
  let prisma: any;
  let events: any;
  let timeline: any;
  let agentClient: any;

  const mockTenant = {
    id: 'tenant-1',
    slug: 'default',
    name: 'Default',
    settings: {
      agentConfig: {
        toneStyle: 'friendly',
        businessName: 'TestBiz',
        industry: 'technology',
        customPrompt: 'Be helpful',
        qualificationQuestions: ['What is your budget?', 'What is your timeline?'],
      },
    },
  };

  const mockTimelineEntry = { id: 'tl-1', type: 'agent_run_completed', leadId: 'lead-1' };
  const mockEvent = { id: 'evt-1', type: 'agent.run_completed' };

  beforeEach(async () => {
    prisma = {
      tenant: {
        findFirst: jest.fn().mockResolvedValue(mockTenant),
        update: jest.fn().mockResolvedValue({ ...mockTenant, settings: { agentConfig: {} } }),
      },
      conversationMessage: {
        count: jest.fn().mockResolvedValue(150),
      },
      lead: {
        count: jest.fn().mockImplementation(({ where }: any) => {
          if (where?.status === 'QUALIFIED') return Promise.resolve(25);
          if (where?.status === 'APPOINTMENT_BOOKED') return Promise.resolve(10);
          return Promise.resolve(500);
        }),
      },
    };

    events = {
      emit: jest.fn().mockResolvedValue(mockEvent),
    };

    timeline = {
      add: jest.fn().mockResolvedValue(mockTimelineEntry),
    };

    agentClient = {
      trigger: jest.fn().mockResolvedValue(undefined),
    };

    // Reset env before each test to defaults
    delete process.env.AGENT_MODEL;
    delete process.env.GOOGLE_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.DEEPSEEK_API_KEY;
    delete process.env.AGENT_SERVICE_URL;
    delete process.env.AGENT_INBOUND_KEY;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentService,
        { provide: PrismaService, useValue: prisma },
        { provide: EventsService, useValue: events },
        { provide: TimelineService, useValue: timeline },
        { provide: AgentClientService, useValue: agentClient },
        { provide: KhojClientService, useValue: { saveMemory: jest.fn().mockResolvedValue(undefined) } },
      ],
    }).compile();

    service = module.get<AgentService>(AgentService);
  });

  afterEach(() => {
    // Clean up any env vars set during tests
    delete process.env.AGENT_MODEL;
    delete process.env.GOOGLE_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.DEEPSEEK_API_KEY;
    delete process.env.AGENT_SERVICE_URL;
    delete process.env.AGENT_INBOUND_KEY;
  });

  // ── recordRunSummary ─────────────────────────────────────────────

  it('should record a run summary with timeline and event', async () => {
    const result = await service.recordRunSummary({
      runId: 'run-1',
      leadId: 'lead-1',
      actions: [{ tool: 'qualify', status: 'success' }, { tool: 'send_email', status: 'success' }],
      model: 'gemini-2.5-flash',
      startedAt: '2025-01-01T00:00:00Z',
      finishedAt: '2025-01-01T00:01:00Z',
    });

    expect(result.recorded).toBe(true);
    expect(result.runId).toBe('run-1');
    expect(timeline.add).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'agent_run_completed',
        leadId: 'lead-1',
        description: expect.stringContaining('qualify: success, send_email: success'),
      }),
    );
    expect(events.emit).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'agent.run_completed',
        leadId: 'lead-1',
        entityId: 'run-1',
      }),
    );
  });

  it('should record a run summary with no actions', async () => {
    const result = await service.recordRunSummary({
      runId: 'run-2',
      leadId: 'lead-2',
      actions: [],
      model: 'gemini-2.5-flash',
      startedAt: '2025-01-01T00:00:00Z',
      finishedAt: '2025-01-01T00:01:00Z',
    });

    expect(result.recorded).toBe(true);
    expect(timeline.add).toHaveBeenCalledWith(
      expect.objectContaining({
        description: expect.stringContaining('no actions'),
      }),
    );
  });

  // ── getAgentConfig ───────────────────────────────────────────────

  it('should get agent config from tenant settings', async () => {
    const config = await service.getAgentConfig();
    expect(config.toneStyle).toBe('friendly');
    expect(config.businessName).toBe('TestBiz');
    expect(config.industry).toBe('technology');
    expect(config.customPrompt).toBe('Be helpful');
    expect(config.qualificationQuestions).toHaveLength(2);
  });

  it('should return defaults when tenant has no agent config', async () => {
    prisma.tenant.findFirst.mockResolvedValue({ id: 'tenant-1', slug: 'default', settings: {} });
    const config = await service.getAgentConfig();
    expect(config.toneStyle).toBe('professional');
    expect(config.businessName).toBe('My Business');
    expect(config.industry).toBe('generic');
    expect(config.customPrompt).toBe('');
    expect(config.qualificationQuestions).toEqual([]);
  });

  it('should return defaults when tenant is null', async () => {
    prisma.tenant.findFirst.mockResolvedValue(null);
    const config = await service.getAgentConfig();
    expect(config.toneStyle).toBe('professional');
    expect(config.businessName).toBe('My Business');
  });

  // ── setAgentConfig ───────────────────────────────────────────────

  it('should set agent config by merging with existing', async () => {
    const config = await service.setAgentConfig({ toneStyle: 'professional', businessName: 'UpdatedBiz' });
    expect(config.toneStyle).toBe('professional');
    expect(config.businessName).toBe('UpdatedBiz');
    expect(config.industry).toBe('technology'); // preserved
    expect(prisma.tenant.update).toHaveBeenCalled();
  });

  it('should throw error when no default tenant found for setAgentConfig', async () => {
    prisma.tenant.findFirst.mockResolvedValue(null);
    await expect(service.setAgentConfig({ toneStyle: 'casual' })).rejects.toThrow('No default tenant found');
  });

  // ── getStatus ────────────────────────────────────────────────────

  it('should return agent status with default env values', async () => {
    process.env.AGENT_SERVICE_URL = 'http://agent-service:8000';
    process.env.GOOGLE_API_KEY = 'test-key';

    const status = await service.getStatus();
    expect(status.online).toBe(true);
    expect(status.model).toBe('gemini-2.5-flash');
    expect(status.apiKeyConfigured).toBe(true);
    expect(status.tone.style).toBe('friendly');
    expect(status.qualificationQuestions).toHaveLength(2);
    expect(status.stats).toBeDefined();
  });

  it('should return offline status when AGENT_SERVICE_URL is not set', async () => {
    const status = await service.getStatus();
    expect(status.online).toBe(false);
    expect(status.apiKeyConfigured).toBe(false);
  });

  it('should use custom AGENT_MODEL env var', async () => {
    process.env.AGENT_MODEL = 'gpt-4';
    process.env.OPENAI_API_KEY = 'sk-test';
    const status = await service.getStatus();
    expect(status.model).toBe('gpt-4');
    expect(status.apiKeyConfigured).toBe(true);
  });

  // ── getStats ─────────────────────────────────────────────────────

  it('should return aggregated stats from the database', async () => {
    const stats = await service.getStats();
    expect(stats.conversationsHandled).toBe(150);
    expect(stats.leadsQualified).toBe(25);
    expect(stats.appointmentsBooked).toBe(10);
    expect(prisma.conversationMessage.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { channel: { in: ['CHATBOT', 'WHATSAPP'] } },
      }),
    );
  });

  it('should return zero stats when no data exists', async () => {
    prisma.conversationMessage.count.mockResolvedValue(0);
    prisma.lead.count.mockResolvedValue(0);
    const stats = await service.getStats();
    expect(stats.conversationsHandled).toBe(0);
    expect(stats.leadsQualified).toBe(0);
    expect(stats.appointmentsBooked).toBe(0);
  });

  // ── testAgent ────────────────────────────────────────────────────

  it('should return response from agent service when available', async () => {
    process.env.AGENT_SERVICE_URL = 'http://agent-service:8000';
    process.env.AGENT_INBOUND_KEY = 'test-key';

    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ response: 'Hello from agent!' }),
    });

    const result = await service.testAgent('Hello', 'WHATSAPP');
    expect(result.response).toBe('Hello from agent!');
    expect(result.source).toBe('agent-service');

    global.fetch = originalFetch;
  });

  it('should fall back when agent service returns non-ok', async () => {
    process.env.AGENT_SERVICE_URL = 'http://agent-service:8000';

    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({ ok: false });

    const result = await service.testAgent('Hello', 'WHATSAPP');
    expect(result.source).toBe('fallback');
    expect(result.response).toBeTruthy();

    global.fetch = originalFetch;
  });

  it('should fall back when agent service call fails', async () => {
    process.env.AGENT_SERVICE_URL = 'http://agent-service:8000';

    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

    const result = await service.testAgent('Hello', 'WHATSAPP');
    expect(result.source).toBe('fallback');
    expect(result.response).toBeTruthy();

    global.fetch = originalFetch;
  });

  it('should use fallback when no agent service URL is configured', async () => {
    const result = await service.testAgent('Hello', 'WHATSAPP');
    expect(result.source).toBe('fallback');
    expect(result.response).toBeTruthy();
  });

  // ── updateConfig ─────────────────────────────────────────────────

  it('should update config with partial fields', async () => {
    const result = await service.updateConfig({ businessName: 'NewBiz', toneStyle: 'casual' });
    expect(result.success).toBe(true);
    expect(result.config.businessName).toBe('NewBiz');
    expect(result.config.toneStyle).toBe('casual');
    // preserved from existing mock
    expect(result.config.industry).toBe('technology');
  });

  it('should filter empty qualification questions', async () => {
    const result = await service.updateConfig({
      qualificationQuestions: ['What is your budget?', '', '  ', 'What is your timeline?'],
    });
    expect(result.config.qualificationQuestions).toHaveLength(2);
    expect(result.config.qualificationQuestions).toEqual(['What is your budget?', 'What is your timeline?']);
  });

  it('should update config with only empty fields gracefully', async () => {
    const result = await service.updateConfig({});
    expect(result.success).toBe(true);
    expect(result.config).toBeDefined();
  });

  // ── pushConfigToAgentService (private, tested via setAgentConfig) ─
  // This is tested indirectly through setAgentConfig/updateConfig

  it('should handle setAgentConfig when AGENT_SERVICE_URL is set', async () => {
    process.env.AGENT_SERVICE_URL = 'http://agent-service:8000';
    process.env.AGENT_INBOUND_KEY = 'test-key';

    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({ ok: true });

    const config = await service.setAgentConfig({ businessName: 'PushedBiz' });
    expect(config.businessName).toBe('PushedBiz');
    expect(global.fetch).toHaveBeenCalled();

    global.fetch = originalFetch;
  });

  it('should not fail when pushConfigToAgentService URL is unreachable', async () => {
    process.env.AGENT_SERVICE_URL = 'http://agent-service:8000';

    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockRejectedValue(new Error('Connection refused'));

    const config = await service.setAgentConfig({ businessName: 'OfflineBiz' });
    expect(config.businessName).toBe('OfflineBiz');

    global.fetch = originalFetch;
  });

  it('should skip pushConfigToAgentService when URL is not set', async () => {
    const originalFetch = global.fetch;
    global.fetch = jest.fn();

    await service.setAgentConfig({ businessName: 'NoPushBiz' });
    expect(global.fetch).not.toHaveBeenCalled();

    global.fetch = originalFetch;
  });
});
