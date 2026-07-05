import { Test, TestingModule } from '@nestjs/testing';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { WebhookSecurityService } from '../shared/webhook-security.service';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';

describe('WebhooksController', () => {
  let controller: WebhooksController;

  const webhooksService = {
    handleFormSubmit: jest.fn().mockResolvedValue({ data: { contact: { id: 'c-1' }, lead: { id: 'l-1' } } }),
    handleWhatsApp: jest.fn().mockResolvedValue({ data: { contact: { id: 'c-2' }, lead: { id: 'l-2' } } }),
    handleTelegram: jest.fn().mockResolvedValue({ data: { contact: { id: 'c-3' }, lead: { id: 'l-3' } } }),
    handleGeneric: jest.fn().mockResolvedValue({ data: { received: true } }),
    handlePayment: jest.fn().mockResolvedValue({ data: { payment: {}, status: 'received' } }),
    handleSocialWebhook: jest.fn().mockResolvedValue({ data: { lead: { id: 'l-4' } } }),
    handleVoiceIncoming: jest.fn().mockResolvedValue({ data: { lead: { id: 'l-5' } } }),
    handleVoiceStatus: jest.fn().mockResolvedValue({ data: { received: true } }),
  };

  const webhookSecurity = {
    verifyWebhookApiKey: jest.fn().mockReturnValue(true),
    verifyWhatsAppSignature: jest.fn().mockReturnValue(true),
    verifyStripeSignature: jest.fn().mockReturnValue(true),
  };

  const mockReq = (rawBody?: Buffer) =>
    ({ rawBody: rawBody ?? Buffer.from('{}') }) as any;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WebhooksController],
      providers: [
        { provide: WebhooksService, useValue: webhooksService },
        { provide: WebhookSecurityService, useValue: webhookSecurity },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('mock-token') } },
      ],
    }).compile();

    controller = module.get<WebhooksController>(WebhooksController);
  });

  describe('POST /webhooks/forms', () => {
    it('should process form webhook with valid API key', async () => {
      const dto = { name: 'John', email: 'john@test.com', message: 'Interested' };
      const result: any = await controller.formWebhook(dto as any, 'valid-key', mockReq());
      expect(result.data.lead.id).toBe('l-1');
      expect(webhookSecurity.verifyWebhookApiKey).toHaveBeenCalledWith('valid-key', 'forms');
      expect(webhooksService.handleFormSubmit).toHaveBeenCalledWith('external', dto, expect.any(Object));
    });

    it('should throw UnauthorizedException when API key is missing', async () => {
      webhookSecurity.verifyWebhookApiKey.mockReturnValueOnce(false);
      const dto = { name: 'John', email: 'john@test.com' };
      await expect(
        controller.formWebhook(dto as any, '', mockReq()),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when API key is invalid', async () => {
      webhookSecurity.verifyWebhookApiKey.mockReturnValueOnce(false);
      const dto = { name: 'John' };
      await expect(
        controller.formWebhook(dto as any, 'bad-key', mockReq()),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('POST /webhooks/whatsapp', () => {
    it('should process WhatsApp webhook with valid signature', async () => {
      const dto = { entry: [], object: 'whatsapp_business_account' };
      const result: any = await controller.whatsappWebhook(dto as any, 'sha256=abc123', mockReq());
      expect(result.data.lead.id).toBe('l-2');
      expect(webhooksService.handleWhatsApp).toHaveBeenCalledWith('whatsapp', dto, expect.any(Object));
    });

    it('should throw UnauthorizedException when signature is invalid', async () => {
      webhookSecurity.verifyWhatsAppSignature.mockReturnValueOnce(false);
      const dto = { entry: [], object: 'whatsapp_business_account' };
      await expect(
        controller.whatsappWebhook(dto as any, 'invalid', mockReq()),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should use rawBody when available for signature verification', async () => {
      const rawBody = Buffer.from(JSON.stringify({ entry: [] }));
      const dto = { entry: [], object: 'whatsapp_business_account' };
      await controller.whatsappWebhook(dto as any, 'sha256=abc123', mockReq(rawBody));
      expect(webhookSecurity.verifyWhatsAppSignature).toHaveBeenCalledWith('sha256=abc123', rawBody);
    });

    it('should fall back to serialized body when rawBody is not available', async () => {
      const dto = { entry: [], object: 'whatsapp_business_account' };
      await controller.whatsappWebhook(dto as any, 'sha256=abc123', {} as any);
      expect(webhookSecurity.verifyWhatsAppSignature).toHaveBeenCalled();
    });
  });

  describe('POST /webhooks/telegram', () => {
    it('should process Telegram webhook with valid message', async () => {
      const dto = {
        update_id: 1,
        message: { message_id: 100, chat: { id: 12345, type: 'private' }, text: '/start', date: 1700000000 },
      };
      const result: any = await controller.telegramWebhook(dto as any, mockReq());
      expect(result.data.lead.id).toBe('l-3');
      expect(webhooksService.handleTelegram).toHaveBeenCalledWith(dto, expect.any(Object));
    });

    it('should return ignored status when no chat message exists', async () => {
      const dto = { update_id: 2 };
      const result = await controller.telegramWebhook(dto as any, mockReq());
      expect(result).toEqual({ status: 'ignored', reason: 'no chat message' });
      expect(webhooksService.handleTelegram).not.toHaveBeenCalled();
    });

    it('should return ignored status when chat has no id', async () => {
      const dto = { update_id: 3, message: { message_id: 101, chat: {}, text: 'hi', date: 1700000000 } };
      const result = await controller.telegramWebhook(dto as any, mockReq());
      expect(result).toEqual({ status: 'ignored', reason: 'no chat message' });
    });
  });

  describe('POST /webhooks/social', () => {
    it('should process social webhook with valid API key', async () => {
      const dto = { name: 'John', email: 'john@test.com', source: 'facebook' };
      const result: any = await controller.socialWebhook(dto as any, 'valid-key', mockReq());
      expect(result.data.lead.id).toBe('l-4');
      expect(webhookSecurity.verifyWebhookApiKey).toHaveBeenCalledWith('valid-key', 'social');
      expect(webhooksService.handleSocialWebhook).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when API key is invalid', async () => {
      webhookSecurity.verifyWebhookApiKey.mockReturnValueOnce(false);
      const dto = { data: {} };
      await expect(
        controller.socialWebhook(dto as any, 'bad-key', mockReq()),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('POST /webhooks/calls', () => {
    it('should process call webhook with valid API key', async () => {
      const dto = { data: { callId: 'call-1' }, event: 'call_incoming' };
      const result: any = await controller.callWebhook(dto as any, 'valid-key', mockReq());
      expect(result.data.received).toBe(true);
      expect(webhookSecurity.verifyWebhookApiKey).toHaveBeenCalledWith('valid-key', 'calls');
      expect(webhooksService.handleGeneric).toHaveBeenCalledWith('phone', 'phone_call', dto);
    });

    it('should throw UnauthorizedException when API key is missing', async () => {
      webhookSecurity.verifyWebhookApiKey.mockReturnValueOnce(false);
      await expect(
        controller.callWebhook({} as any, '', mockReq()),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('POST /webhooks/payments', () => {
    it('should process payment webhook with valid Stripe signature', async () => {
      const dto = { data: { paymentId: 'pi_123' }, event: 'payment_intent.succeeded' };
      const result: any = await controller.paymentWebhook(dto as any, 't=12345,v1=abc', mockReq());
      expect(result.data.status).toBe('received');
      expect(webhooksService.handlePayment).toHaveBeenCalledWith('payment', dto);
    });

    it('should throw UnauthorizedException when Stripe signature is invalid', async () => {
      webhookSecurity.verifyStripeSignature.mockReturnValueOnce(false);
      const dto = { data: {} };
      await expect(
        controller.paymentWebhook(dto as any, 'invalid', mockReq()),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('POST /webhooks/chatbot', () => {
    it('should process chatbot webhook with valid API key', async () => {
      const dto = { data: { message: 'Hi bot' }, event: 'chatbot_message' };
      const result: any = await controller.chatbotWebhook(dto as any, 'valid-key', mockReq());
      expect(result.data.received).toBe(true);
      expect(webhookSecurity.verifyWebhookApiKey).toHaveBeenCalledWith('valid-key', 'chatbot');
      expect(webhooksService.handleGeneric).toHaveBeenCalledWith('chatbot', 'chatbot_message', dto);
    });

    it('should throw UnauthorizedException when API key is invalid', async () => {
      webhookSecurity.verifyWebhookApiKey.mockReturnValueOnce(false);
      await expect(
        controller.chatbotWebhook({} as any, 'bad-key', mockReq()),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('POST /webhooks/mobile-app', () => {
    it('should process mobile app webhook with valid API key', async () => {
      const dto = { data: { event: 'app_open' }, event: 'app_event' };
      const result: any = await controller.mobileAppWebhook(dto as any, 'valid-key', mockReq());
      expect(result.data.received).toBe(true);
      expect(webhookSecurity.verifyWebhookApiKey).toHaveBeenCalledWith('valid-key', 'mobile-app');
      expect(webhooksService.handleGeneric).toHaveBeenCalledWith('mobile-app', 'app_event', dto);
    });

    it('should throw UnauthorizedException when API key is invalid', async () => {
      webhookSecurity.verifyWebhookApiKey.mockReturnValueOnce(false);
      await expect(
        controller.mobileAppWebhook({} as any, 'bad-key', mockReq()),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
