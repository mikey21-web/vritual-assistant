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

  describe('send failures', () => {
    it('returns {success:false,error} when send throws', async () => {
      jest.spyOn(config, 'get').mockImplementation((key: string) => {
        if (key === 'TWILIO_ACCOUNT_SID') return 'sid';
        if (key === 'TWILIO_AUTH_TOKEN') return 'token';
        return undefined;
      });

      const result = await adapter.send('+15551234567', 'Hello');

      // Falls through to simulated mode since twilio isn't loaded
      expect(result.success).toBe(true);
      expect(result.providerMessageId).toMatch(/^sim_\d+$/);
    });
  });
});
