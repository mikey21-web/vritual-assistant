import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { TwilioSmsAdapter } from './sms.adapter';

describe('TwilioSmsAdapter', () => {
  let adapter: TwilioSmsAdapter;
  let config: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TwilioSmsAdapter,
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    }).compile();

    adapter = module.get<TwilioSmsAdapter>(TwilioSmsAdapter);
    config = module.get<ConfigService>(ConfigService);
  });

  describe('unconfigured (simulated mode)', () => {
    it('returns success with simulated messageId when Twilio not configured', async () => {
      jest.spyOn(config, 'get').mockReturnValue(undefined);
      const result = await adapter.send('+15551234567', 'Hello from test');
      expect(result.success).toBe(true);
      expect(result.providerMessageId).toMatch(/^sim_\d+$/);
      expect(result.error).toBeUndefined();
    });
  });

  describe('configured but API fails', () => {
    it('returns error when Twilio API call fails', async () => {
      jest.spyOn(config, 'get').mockImplementation((key: string) => {
        if (key === 'TWILIO_ACCOUNT_SID') return 'test-sid';
        if (key === 'TWILIO_AUTH_TOKEN') return 'test-token';
        if (key === 'TWILIO_PHONE_NUMBER') return '+15551111111';
        return undefined;
      });

      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: jest.fn().mockResolvedValue({ message: 'Authentication failed' }),
      });

      const result = await adapter.send('+15551234567', 'Hello');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Authentication failed');
    });
  });
});
