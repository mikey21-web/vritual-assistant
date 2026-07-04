import { Controller, Post, Body, HttpCode, Headers, UnauthorizedException, Req, RawBodyRequest, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiExcludeEndpoint } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { WebhooksService } from './webhooks.service';
import { WebhookSecurityService } from '../shared/webhook-security.service';
import { Public } from '../auth/public.decorator';
import { FormWebhookDto, WhatsAppWebhookDto, GenericWebhookDto, TelegramWebhookDto, SocialWebhookDto, VoiceIncomingWebhookDto, VoiceStatusWebhookDto } from './dto/webhook.dto';

@ApiTags('Webhooks')
@Controller('webhooks')
@Throttle({ default: { limit: 60, ttl: 60000 } })
export class WebhooksController {
  constructor(
    private service: WebhooksService,
    private security: WebhookSecurityService,
  ) {}

  @Public()
  @Post('forms') @HttpCode(200) @ApiOperation({ summary: 'Receive form submission webhook (API key auth)' })
  async formWebhook(
    @Body() d: FormWebhookDto,
    @Headers('x-api-key') apiKey?: string,
    @Req() req?: RawBodyRequest<Request>,
  ) {
    if (!this.security.verifyWebhookApiKey(apiKey || '', 'forms')) {
      throw new UnauthorizedException('Invalid webhook API key');
    }
    return this.service.handleFormSubmit('external', d, req);
  }

  @Public()
  @Post('whatsapp') @HttpCode(200) @ApiOperation({ summary: 'Receive WhatsApp webhook (signature verified)' })
  async whatsappWebhook(
    @Body() d: WhatsAppWebhookDto,
    @Headers('x-hub-signature-256') signature?: string,
    @Req() req?: RawBodyRequest<Request>,
  ) {
    const rawBody = req?.rawBody ?? Buffer.from(JSON.stringify(d));
    if (!this.security.verifyWhatsAppSignature(signature || '', rawBody)) {
      throw new UnauthorizedException('Invalid WhatsApp signature');
    }
    return this.service.handleWhatsApp('whatsapp', d, req);
  }

  @Public()
  @Post('telegram') @HttpCode(200) @ApiOperation({ summary: 'Receive Telegram webhook (bot updates)' })
  async telegramWebhook(
    @Body() d: TelegramWebhookDto,
    @Req() req?: RawBodyRequest<Request>,
  ) {
    // Verify the webhook has a message with text
    if (!d.message?.chat?.id) return { status: 'ignored', reason: 'no chat message' };
    return this.service.handleTelegram(d, req);
  }

  @Public()
  @Post('social') @HttpCode(200) @ApiOperation({ summary: 'Receive social media lead (Facebook/Instagram/LinkedIn) — API key auth' })
  async socialWebhook(
    @Body() d: SocialWebhookDto,
    @Headers('x-api-key') apiKey?: string,
    @Req() req?: RawBodyRequest<Request>,
  ) {
    if (!this.security.verifyWebhookApiKey(apiKey || '', 'social')) {
      throw new UnauthorizedException('Invalid webhook API key');
    }
    return this.service.handleSocialWebhook({
      name: d.name,
      email: d.email,
      phone: d.phone,
      message: d.message,
      source: d.source || 'social',
      leadId: d.leadId,
      metadata: d.metadata,
    }, req);
  }

  @Public()
  @Post('calls') @HttpCode(200) @ApiOperation({ summary: 'Receive phone call webhook (API key auth)' })
  async callWebhook(
    @Body() d: GenericWebhookDto,
    @Headers('x-api-key') apiKey?: string,
    @Req() req?: RawBodyRequest<Request>,
  ) {
    if (!this.security.verifyWebhookApiKey(apiKey || '', 'calls')) {
      throw new UnauthorizedException('Invalid webhook API key');
    }
    return this.service.handleGeneric('phone', 'phone_call', d);
  }

  // ─── Twilio Voice Webhooks ──────────────────────────────────────────

  @Public()
  @Post('voice/incoming') @HttpCode(200)
  @ApiOperation({ summary: 'Twilio Voice — incoming call webhook (returns TwiML)' })
  @ApiExcludeEndpoint()
  async voiceIncoming(
    @Body() d: VoiceIncomingWebhookDto,
    @Req() req?: RawBodyRequest<Request>,
    @Res() res?: Response,
  ) {
    // Process asynchronously (fire & forget the lead/conversation creation)
    const resultPromise = this.service.handleVoiceIncoming(d, req);

    // Return TwiML that connects the caller to the configured agent number
    const agentNumber = process.env.TWILIO_VOICE_AGENT_NUMBER || '';
    const twiml = agentNumber
      ? `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial timeout="30" record="true">${agentNumber}</Dial>
</Response>`
      : `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna-Neural" language="en-US">
    Thank you for calling. We are not able to take your call right now. Please try again later. Goodbye.
  </Say>
</Response>`;

    // Set response type for Twilio
    res?.set('Content-Type', 'text/xml');
    res?.send(twiml);

    // Await processing after response sent (non-blocking)
    resultPromise.catch((err) => console.error('Voice incoming processing error:', err));
  }

  @Public()
  @Post('voice/status') @HttpCode(200)
  @ApiOperation({ summary: 'Twilio Voice — call status callback webhook' })
  @ApiExcludeEndpoint()
  async voiceStatus(
    @Body() d: VoiceStatusWebhookDto,
  ) {
    return this.service.handleVoiceStatus(d);
  }

  @Public()
  @Post('payments') @HttpCode(200) @ApiOperation({ summary: 'Receive payment webhook (Stripe-style sig verified)' })
  async paymentWebhook(
    @Body() d: GenericWebhookDto,
    @Headers('stripe-signature') signature?: string,
    @Req() req?: RawBodyRequest<Request>,
  ) {
    const rawBody = req?.rawBody ?? Buffer.from(JSON.stringify(d));
    if (!this.security.verifyStripeSignature(signature || '', rawBody)) {
      throw new UnauthorizedException('Invalid payment signature');
    }
    return this.service.handlePayment('payment', d);
  }

  @Public()
  @Post('chatbot') @HttpCode(200)
  async chatbotWebhook(
    @Body() d: GenericWebhookDto,
    @Headers('x-api-key') apiKey?: string,
    @Req() req?: RawBodyRequest<Request>,
  ) {
    if (!this.security.verifyWebhookApiKey(apiKey || '', 'chatbot')) {
      throw new UnauthorizedException('Invalid webhook API key');
    }
    return this.service.handleGeneric('chatbot', 'chatbot_message', d);
  }

  @Public()
  @Post('mobile-app') @HttpCode(200)
  async mobileAppWebhook(
    @Body() d: GenericWebhookDto,
    @Headers('x-api-key') apiKey?: string,
    @Req() req?: RawBodyRequest<Request>,
  ) {
    if (!this.security.verifyWebhookApiKey(apiKey || '', 'mobile-app')) {
      throw new UnauthorizedException('Invalid webhook API key');
    }
    return this.service.handleGeneric('mobile-app', 'app_event', d);
  }
}
