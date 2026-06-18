import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { WebhookSecurityService } from './webhook-security.service';

describe('WebhookSecurityService', () => {
  let service: WebhookSecurityService;
  let configGet: jest.Mock;

  beforeEach(async () => {
    configGet = jest.fn();
    const module = await Test.createTestingModule({
      providers: [
        WebhookSecurityService,
        { provide: ConfigService, useValue: { get: configGet } },
      ],
    }).compile();
    service = module.get<WebhookSecurityService>(WebhookSecurityService);
  });

  describe('verifyWebhookApiKey', () => {
    it('should reject missing key', () => {
      configGet.mockReturnValue('valid-key-1,valid-key-2');
      expect(service.verifyWebhookApiKey('', 'forms')).toBe(false);
    });

    it('should reject wrong key', () => {
      configGet.mockReturnValue('valid-key-1,valid-key-2');
      expect(service.verifyWebhookApiKey('wrong-key', 'forms')).toBe(false);
    });

    it('should accept valid key', () => {
      configGet.mockReturnValue('valid-key-1,valid-key-2');
      expect(service.verifyWebhookApiKey('valid-key-1', 'forms')).toBe(true);
    });

    it('should accept second valid key', () => {
      configGet.mockReturnValue('valid-key-1,valid-key-2');
      expect(service.verifyWebhookApiKey('valid-key-2', 'social')).toBe(true);
    });

    it('should return false when no keys configured', () => {
      configGet.mockReturnValue('');
      expect(service.verifyWebhookApiKey('anything', 'forms')).toBe(false);
    });
  });

  describe('verifyWhatsAppSignature', () => {
    it('should reject when app secret not configured', () => {
      configGet.mockReturnValue(undefined);
      const body = Buffer.from(JSON.stringify({ object: 'whatsapp_business_account' }));
      expect(service.verifyWhatsAppSignature('sha256=abc123', body)).toBe(false);
    });
  });

  describe('verifyStripeSignature', () => {
    it('should reject when stripe secret not configured', () => {
      configGet.mockReturnValue(undefined);
      const body = Buffer.from(JSON.stringify({ type: 'checkout.session.completed' }));
      expect(service.verifyStripeSignature('t=123,v1=abc', body)).toBe(false);
    });
  });
});
