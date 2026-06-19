import { Test, TestingModule } from '@nestjs/testing';
import { IntegrationsService } from './integrations.service';
import { PrismaService } from '../prisma/prisma.service';
import { HubspotAdapter, SalesforceAdapter, ZohoAdapter } from '../shared/adapters/crm.adapter';
import { WhatsAppCloudAdapter } from '../shared/adapters/messaging.adapter';
import { TwilioSmsAdapter } from '../shared/adapters/sms.adapter';
import { CalendlyAdapter, GoogleCalendarAdapter } from '../shared/adapters/calendar.adapter';
import { ConfigService } from '@nestjs/config';

describe('IntegrationsService', () => {
  let service: IntegrationsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      integration: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IntegrationsService,
        { provide: PrismaService, useValue: prisma },
        { provide: HubspotAdapter, useValue: { healthCheck: jest.fn() } },
        { provide: SalesforceAdapter, useValue: { healthCheck: jest.fn() } },
        { provide: ZohoAdapter, useValue: { healthCheck: jest.fn() } },
        { provide: WhatsAppCloudAdapter, useValue: { healthCheck: jest.fn() } },
        { provide: TwilioSmsAdapter, useValue: {} },
        { provide: CalendlyAdapter, useValue: { healthCheck: jest.fn() } },
        { provide: GoogleCalendarAdapter, useValue: { healthCheck: jest.fn() } },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    }).compile();

    service = module.get<IntegrationsService>(IntegrationsService);
  });

  it('should return unsupported for unknown integration type', async () => {
    prisma.integration.findUnique.mockResolvedValue({ id: 'i-1', type: 'UNKNOWN', name: 'Test', config: {} });
    const result = await service.test('i-1');
    expect(result.status).toBe('unsupported');
  });

  it('should return healthy for TWILIO_SMS with valid config', async () => {
    prisma.integration.findUnique.mockResolvedValue({
      id: 'i-2',
      type: 'TWILIO_SMS',
      name: 'SMS',
      config: { TWILIO_ACCOUNT_SID: 'sid', TWILIO_AUTH_TOKEN: 'token' },
    });
    prisma.integration.update.mockResolvedValue({});
    const result = await service.test('i-2');
    expect(result.status).toBe('connected');
  });

  it('should return unhealthy for TWILIO_SMS without config', async () => {
    prisma.integration.findUnique.mockResolvedValue({ id: 'i-3', type: 'TWILIO_SMS', name: 'SMS', config: {} });
    prisma.integration.update.mockResolvedValue({});
    const result = await service.test('i-3');
    expect(result.status).toBe('disconnected');
  });
});
