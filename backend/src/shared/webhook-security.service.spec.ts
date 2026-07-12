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

  describe('verifyTwilioSignature', () => {
    const crypto = require('crypto');
    const authToken = 'test-auth-token';
    const url = 'https://example.com/webhooks/voice/inbound';
    const params = { CallSid: 'CA123', From: '+15551234567' };

    function sign(token: string, u: string, p: Record<string, any>): string {
      let data = u;
      for (const key of Object.keys(p).sort()) data += key + String(p[key]);
      return crypto.createHmac('sha1', token).update(data, 'utf8').digest('base64');
    }

    it('accepts a correctly signed request', () => {
      configGet.mockReturnValue(authToken);
      const signature = sign(authToken, url, params);
      expect(service.verifyTwilioSignature(signature, url, params)).toBe(true);
    });

    it('rejects a tampered signature', () => {
      configGet.mockReturnValue(authToken);
      expect(service.verifyTwilioSignature('not-the-real-signature', url, params)).toBe(false);
    });

    it('rejects when the params do not match what was signed', () => {
      configGet.mockReturnValue(authToken);
      const signature = sign(authToken, url, params);
      expect(service.verifyTwilioSignature(signature, url, { ...params, From: '+15559999999' })).toBe(false);
    });

    it('rejects when TWILIO_AUTH_TOKEN is not configured', () => {
      configGet.mockReturnValue(undefined);
      const signature = sign(authToken, url, params);
      expect(service.verifyTwilioSignature(signature, url, params)).toBe(false);
    });
  });
});
