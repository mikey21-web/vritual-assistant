import { Test, TestingModule } from '@nestjs/testing';
import { MonitoringService, HealthReport, ServiceCheckReport } from './monitoring.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { getQueueToken } from '@nestjs/bullmq';
import { HubspotAdapter, SalesforceAdapter, ZohoAdapter } from '../shared/adapters/crm.adapter';
import { WhatsAppCloudAdapter, TelegramBotAdapter } from '../shared/adapters/messaging.adapter';
import { TwilioSmsAdapter } from '../shared/adapters/sms.adapter';
import { CalendlyAdapter, GoogleCalendarAdapter } from '../shared/adapters/calendar.adapter';
import { EmailAdapter } from '../shared/adapters/email.adapter';
import * as cryptoUtil from '../shared/crypto.util';

// Shared mock instance for ioredis so tests can control behavior
const mockRedisInstance = {
  ping: jest.fn().mockResolvedValue('PONG'),
  quit: jest.fn().mockResolvedValue(undefined),
};

jest.mock('ioredis', () => ({
  Redis: jest.fn().mockImplementation(() => mockRedisInstance),
}));

// Mock the crypto utility
jest.mock('../shared/crypto.util', () => ({
  envelopeDecrypt: jest.fn(),
}));

describe('MonitoringService', () => {
  let service: MonitoringService;
  let prisma: any;
  let config: any;
  let queue: any;
  let hubspot: any;
  let salesforce: any;
  let zoho: any;
  let whatsApp: any;
  let telegram: any;
  let twilioSms: any;
  let calendly: any;
  let googleCalendar: any;
  let email: any;

  const mockServiceCheck = (overrides = {}): ServiceCheckReport => ({
    service: 'test',
    status: 'ok',
    latencyMs: 5,
    detail: 'OK',
    checkedAt: new Date().toISOString(),
    ...overrides,
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    // Restore Redis mock after clearAllMocks
    mockRedisInstance.ping.mockResolvedValue('PONG');
    mockRedisInstance.quit.mockResolvedValue(undefined);

    prisma = {
      $queryRaw: jest.fn().mockResolvedValue([{ '1': 1 }]),
      integration: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      healthCheck: {
        create: jest.fn().mockResolvedValue({}),
      },
    };

    config = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'REDIS_URL') return 'redis://localhost:6379';
        return null;
      }),
    };

    queue = {
      add: jest.fn().mockResolvedValue({ id: 'job-1' }),
    };

    hubspot = { healthCheck: jest.fn().mockResolvedValue(true) };
    salesforce = { healthCheck: jest.fn().mockResolvedValue(true) };
    zoho = { healthCheck: jest.fn().mockResolvedValue(true) };
    whatsApp = { healthCheck: jest.fn().mockResolvedValue(true) };
    telegram = { healthCheck: jest.fn().mockResolvedValue(true) };
    twilioSms = { healthCheck: jest.fn().mockResolvedValue(true) };
    calendly = { healthCheck: jest.fn().mockResolvedValue(true) };
    googleCalendar = { healthCheck: jest.fn().mockResolvedValue(true) };
    email = { healthCheck: jest.fn().mockResolvedValue(true) };

    jest.spyOn(cryptoUtil, 'envelopeDecrypt').mockImplementation((cfg: any) => cfg);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MonitoringService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: config },
        { provide: getQueueToken('monitoring'), useValue: queue },
        { provide: HubspotAdapter, useValue: hubspot },
        { provide: SalesforceAdapter, useValue: salesforce },
        { provide: ZohoAdapter, useValue: zoho },
        { provide: WhatsAppCloudAdapter, useValue: whatsApp },
        { provide: TelegramBotAdapter, useValue: telegram },
        { provide: TwilioSmsAdapter, useValue: twilioSms },
        { provide: CalendlyAdapter, useValue: calendly },
        { provide: GoogleCalendarAdapter, useValue: googleCalendar },
        { provide: EmailAdapter, useValue: email },
      ],
    }).compile();

    service = module.get<MonitoringService>(MonitoringService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('checkDatabase', () => {
    it('should return ok when database is reachable', async () => {
      const result = await service.checkDatabase();
      expect(result.status).toBe('ok');
      expect(result.service).toBe('database');
      expect(result.detail).toContain('PostgreSQL');
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it('should return down when database query fails', async () => {
      prisma.$queryRaw.mockRejectedValue(new Error('Connection refused'));
      const result = await service.checkDatabase();
      expect(result.status).toBe('down');
      expect(result.detail).toBe('Connection refused');
    });

    it('should include latency in database check result', async () => {
      prisma.$queryRaw.mockImplementation(async () => {
        await new Promise((r) => setTimeout(r, 5));
        return [{ '1': 1 }];
      });
      const result = await service.checkDatabase();
      expect(result.latencyMs).toBeGreaterThanOrEqual(5);
    });
  });

  describe('checkRedis', () => {
    it('should return unconfigured when REDIS_URL is not set', async () => {
      config.get.mockReturnValue(undefined);
      const result = await service.checkRedis();
      expect(result.status).toBe('unconfigured');
      expect(result.service).toBe('redis');
      expect(result.detail).toBe('REDIS_URL not set');
    });

    it('should return down when redis connection fails', async () => {
      mockRedisInstance.ping.mockRejectedValue(new Error('Connection timeout'));
      const result = await service.checkRedis();
      expect(result.status).toBe('down');
      expect(result.detail).toBe('Connection timeout');
    });

    afterEach(() => {
      mockRedisInstance.ping.mockResolvedValue('PONG');
    });
  });

  describe('checkQueueLatency', () => {
    it('should return ok when queue is reachable', async () => {
      queue.add.mockResolvedValue({ id: 'job-1' });
      const result = await service.checkQueueLatency();
      expect(result.status).toBe('ok');
      expect(result.service).toBe('queue');
      expect(result.detail).toBe('BullMQ queue reachable');
      expect(queue.add).toHaveBeenCalledWith('health-ping', { ping: expect.any(Number) });
    });

    it('should return down when queue add fails', async () => {
      queue.add.mockRejectedValue(new Error('Redis connection lost'));
      const result = await service.checkQueueLatency();
      expect(result.status).toBe('down');
      expect(result.detail).toBe('Redis connection lost');
    });

    it('should include latency in queue check result', async () => {
      queue.add.mockImplementation(async () => {
        await new Promise((r) => setTimeout(r, 3));
        return { id: 'job-1' };
      });
      const result = await service.checkQueueLatency();
      expect(result.latencyMs).toBeGreaterThanOrEqual(3);
    });
  });

  describe('checkEmail', () => {
    it('should return ok when SMTP is configured', async () => {
      email.healthCheck.mockResolvedValue(true);
      const result = await service.checkEmail();
      expect(result.status).toBe('ok');
      expect(result.service).toBe('email');
      expect(result.detail).toBe('SMTP configured');
    });

    it('should return unconfigured when SMTP is not configured', async () => {
      email.healthCheck.mockResolvedValue(false);
      const result = await service.checkEmail();
      expect(result.status).toBe('unconfigured');
      expect(result.detail).toContain('SMTP not configured');
    });

    it('should return down when healthCheck throws', async () => {
      email.healthCheck.mockRejectedValue(new Error('SMTP connection failed'));
      const result = await service.checkEmail();
      expect(result.status).toBe('down');
      expect(result.detail).toBe('SMTP connection failed');
    });

    it('should include latency for successful email checks', async () => {
      email.healthCheck.mockImplementation(async () => {
        await new Promise((r) => setTimeout(r, 2));
        return true;
      });
      const result = await service.checkEmail();
      expect(result.latencyMs).toBeGreaterThanOrEqual(2);
    });
  });

  describe('checkIntegrations', () => {
    it('should return unconfigured when no active integrations exist', async () => {
      prisma.integration.findMany.mockResolvedValue([]);
      const results = await service.checkIntegrations();
      expect(results).toHaveLength(1);
      expect(results[0].status).toBe('unconfigured');
      expect(results[0].service).toBe('integrations');
    });

    it('should check a HubSpot integration', async () => {
      const mockIntegration = {
        id: 'int-1',
        type: 'HUBSPOT',
        isActive: true,
        config: { apiKey: 'encrypted-key' },
      };
      prisma.integration.findMany.mockResolvedValue([mockIntegration]);
      hubspot.healthCheck.mockResolvedValue(true);

      const results = await service.checkIntegrations();
      expect(results).toHaveLength(1);
      expect(results[0].status).toBe('ok');
      expect(results[0].service).toBe('integration:HUBSPOT');
      expect(results[0].detail).toBe('API reachable');
      expect(hubspot.healthCheck).toHaveBeenCalled();
    });

    it('should report down when integration health check fails', async () => {
      const mockIntegration = {
        id: 'int-1',
        type: 'SALESFORCE',
        isActive: true,
        config: { clientId: 'test', clientSecret: 'secret' },
      };
      prisma.integration.findMany.mockResolvedValue([mockIntegration]);
      salesforce.healthCheck.mockResolvedValue(false);

      const results = await service.checkIntegrations();
      expect(results[0].status).toBe('down');
      expect(results[0].detail).toBe('OAuth failed');
    });

    it('should handle WhatsApp integration', async () => {
      const mockIntegration = {
        id: 'int-2',
        type: 'WHATSAPP',
        isActive: true,
        config: { accessToken: 'token', phoneNumberId: '123' },
      };
      prisma.integration.findMany.mockResolvedValue([mockIntegration]);
      whatsApp.healthCheck.mockResolvedValue(true);

      const results = await service.checkIntegrations();
      expect(results[0].status).toBe('ok');
      expect(results[0].service).toBe('integration:WHATSAPP');
    });

    it('should handle TWILIO_SMS without healthCheck API call', async () => {
      const mockIntegration = {
        id: 'int-3',
        type: 'TWILIO_SMS',
        isActive: true,
        config: { TWILIO_ACCOUNT_SID: 'sid123', TWILIO_AUTH_TOKEN: 'token456' },
      };
      prisma.integration.findMany.mockResolvedValue([mockIntegration]);

      const results = await service.checkIntegrations();
      expect(results[0].status).toBe('ok');
      expect(results[0].detail).toBe('SID configured');
    });

    it('should catch exceptions during integration check', async () => {
      const mockIntegration = {
        id: 'int-4',
        type: 'CALENDLY',
        isActive: true,
        config: { apiKey: 'key' },
      };
      prisma.integration.findMany.mockResolvedValue([mockIntegration]);
      calendly.healthCheck.mockRejectedValue(new Error('Network error'));

      const results = await service.checkIntegrations();
      expect(results[0].status).toBe('down');
      expect(results[0].detail).toBe('Network error');
    });

    it('should handle multiple integrations of different types', async () => {
      prisma.integration.findMany.mockResolvedValue([
        { id: 'int-1', type: 'HUBSPOT', isActive: true, config: {} },
        { id: 'int-2', type: 'TELEGRAM', isActive: true, config: {} },
        { id: 'int-3', type: 'ZOHO', isActive: true, config: {} },
      ]);
      hubspot.healthCheck.mockResolvedValue(true);
      telegram.healthCheck.mockResolvedValue(true);
      zoho.healthCheck.mockResolvedValue(true);

      const results = await service.checkIntegrations();
      expect(results).toHaveLength(3);
      expect(results.map((r) => r.service)).toEqual([
        'integration:HUBSPOT',
        'integration:TELEGRAM',
        'integration:ZOHO',
      ]);
    });
  });

  describe('checkAll', () => {
    it('should return a complete health report', async () => {
      const result = await service.checkAll();
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('uptime');
      expect(result).toHaveProperty('version');
      expect(result).toHaveProperty('services');
      expect(result).toHaveProperty('summary');
    });

    it('should set overall status to ok when all services pass', async () => {
      const result = await service.checkAll();
      expect(result.status).toBe('ok');
      expect(result.summary.down).toBe(0);
    });

    it('should set overall status to degraded when some services are degraded', async () => {
      // Make Redis return a non-PONG response to simulate degraded status
      mockRedisInstance.ping.mockResolvedValue('SOMETHING_ELSE');

      const result = await service.checkAll();
      expect(result.status).toBe('degraded');
    });

    it('should record checkpoints for each service', async () => {
      await service.checkAll();
      expect(prisma.healthCheck.create).toHaveBeenCalled();
    });

    it('should handle a service check that throws unexpectedly', async () => {
      prisma.$queryRaw.mockRejectedValue(new Error('Unexpected DB crash'));
      const result = await service.checkAll();
      expect(result.services.some((s) => s.status === 'down')).toBe(true);
    });

    it('should include version in the report', async () => {
      const result = await service.checkAll();
      expect(result.version).toBeDefined();
      expect(typeof result.version).toBe('string');
    });

    it('should include uptime as a positive number', async () => {
      const result = await service.checkAll();
      expect(result.uptime).toBeGreaterThanOrEqual(0);
    });

    it('should include all service check names in the report', async () => {
      const result = await service.checkAll();
      const serviceNames = result.services.map((s) => s.service);
      expect(serviceNames).toContain('database');
      expect(serviceNames).toContain('redis');
      expect(serviceNames).toContain('queue');
      expect(serviceNames).toContain('email');
    });
  });

  describe('getSimpleStatus', () => {
    it('should return ok when database responds', async () => {
      const result = await service.getSimpleStatus();
      expect(result.status).toBe('ok');
      expect(result.timestamp).toBeDefined();
    });

    it('should return degraded when database fails', async () => {
      prisma.$queryRaw.mockRejectedValue(new Error('Down'));
      const result = await service.getSimpleStatus();
      expect(result.status).toBe('degraded');
    });
  });

  describe('getUptime', () => {
    it('should return uptime in seconds', () => {
      const uptime = service.getUptime();
      expect(uptime).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(uptime)).toBe(true);
    });
  });

  describe('recordCheckpoint', () => {
    it('should record a health checkpoint in the database', async () => {
      await service.recordCheckpoint('database', 'ok', 5);
      expect(prisma.healthCheck.create).toHaveBeenCalledWith({
        data: { service: 'database', status: 'ok', latencyMs: 5 },
      });
    });

    it('should not throw when database write fails', async () => {
      prisma.healthCheck.create.mockRejectedValue(new Error('Write failed'));
      await expect(service.recordCheckpoint('redis', 'down')).resolves.toBeUndefined();
    });

    it('should record checkpoint without latencyMs', async () => {
      await service.recordCheckpoint('queue', 'degraded');
      expect(prisma.healthCheck.create).toHaveBeenCalledWith({
        data: { service: 'queue', status: 'degraded', latencyMs: undefined },
      });
    });
  });
});
