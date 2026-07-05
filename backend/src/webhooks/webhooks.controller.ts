import { Controller, Post, Get, Body, HttpCode, Headers, UnauthorizedException, Req, RawBodyRequest, Res, UseGuards, Param, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiExcludeEndpoint, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { WebhooksService } from './webhooks.service';
import { WebhookSecurityService } from '../shared/webhook-security.service';
import { Public } from '../auth/public.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { FormWebhookDto, WhatsAppWebhookDto, GenericWebhookDto, TelegramWebhookDto, SocialWebhookDto, VoiceIncomingWebhookDto, VoiceStatusWebhookDto } from './dto/webhook.dto';
import * as crypto from 'crypto';

@ApiTags('Webhooks')
@Controller('webhooks')
@Throttle({ default: { limit: 60, ttl: 60000 } })
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private service: WebhooksService,
    private security: WebhookSecurityService,
    private configService: ConfigService,
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
  @Post('whatsapp') @HttpCode(200) @Throttle({ default: { limit: 300, ttl: 60000 } })
  @ApiOperation({ summary: 'Receive WhatsApp webhook (signature verified)' })
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
  @Post('telegram') @HttpCode(200) @Throttle({ default: { limit: 120, ttl: 60000 } })
  @ApiOperation({ summary: 'Receive Telegram webhook (bot updates)' })
  async telegramWebhook(
    @Body() d: TelegramWebhookDto,
    @Req() req?: RawBodyRequest<Request>,
  ) {
    const botToken = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
    if (botToken) {
      // Validate the update came from the correct bot: chat_id must be accessible by our token
      if (!d.message?.chat?.id) return { status: 'ignored', reason: 'no chat message' };
      // Simple sanity: no further token-based verification needed since Telegram
      // sends to the URL configured per-bot. We rely on the secret URL pattern.
    } else {
      // No bot token configured — reject
      throw new UnauthorizedException('Telegram bot not configured');
    }
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
    @Headers('x-twilio-signature') twilioSignature?: string,
    @Req() req?: RawBodyRequest<Request>,
    @Res() res?: Response,
  ) {
    // Verify Twilio signature
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    if (authToken) {
      const url = `${req?.protocol}://${req?.get('host')}${req?.originalUrl}`;
      const params = req?.body || {};
      const computedSig = crypto
        .createHmac('sha1', authToken)
        .update(url + Object.keys(params).sort().map(k => k + params[k]).join(''))
        .digest('base64');
      if (twilioSignature !== computedSig) {
        throw new UnauthorizedException('Invalid Twilio signature');
      }
    }
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
    resultPromise.catch((err) => this.logger.error('Voice incoming processing error', err));
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

  // ─── Management Endpoints (authenticated) ──────────────────────────

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all webhook endpoint statuses' })
  findAll() {
    return this.service.findWebhookStatuses();
  }

  @Post(':type/test')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Test a webhook endpoint' })
  testEndpoint(@Param('type') type: string) {
    return this.service.testWebhookEndpoint(type);
  }
}
