import { Controller, Post, Get, Body, Param, Query, HttpCode, Header, Headers, UnauthorizedException, Req, RawBodyRequest } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { WebhooksService } from './webhooks.service';
import { WebhookSecurityService } from '../shared/webhook-security.service';
import { Public } from '../auth/public.decorator';
import { FormWebhookDto, WhatsAppWebhookDto, GenericWebhookDto, TelegramWebhookDto, WebchatMessageDto, TwilioVoiceWebhookDto } from './dto/webhook.dto';
import { buildGatherTwiml, buildHangupTwiml } from './twiml.util';

const MAX_VOICE_TURNS = 15;

@ApiTags('Webhooks')
@Controller('webhooks')
@Throttle({ default: { limit: 60, ttl: 60000 } })
export class WebhooksController {
  constructor(
    private service: WebhooksService,
    private security: WebhookSecurityService,
    private config: ConfigService,
  ) {}

  // Twilio signs the exact URL it called, so this has to mirror that —
  // configured origin (not req.protocol/host, which can be spoofed behind a
  // proxy) plus whatever path+query Twilio actually hit.
  private publicUrlFor(req?: Request): string {
    const base = (this.config.get<string>('BACKEND_URL') || 'http://localhost:3001').replace(/\/$/, '');
    return `${base}${req?.originalUrl || ''}`;
  }

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
  @Post('webchat/message') @HttpCode(200) @ApiOperation({ summary: 'Receive a message from the embeddable web chat widget (site-key auth)' })
  async webchatMessage(@Body() d: WebchatMessageDto, @Req() req?: RawBodyRequest<Request>) {
    return this.service.handleWebchatMessage(d, req);
  }

  @Public()
  @Get('webchat/:sessionId/messages') @ApiOperation({ summary: 'Poll for new messages in a web chat session (site-key auth)' })
  async webchatMessages(
    @Param('sessionId') sessionId: string,
    @Query('siteKey') siteKey: string,
    @Query('since') since?: string,
  ) {
    return this.service.getWebchatMessages(sessionId, siteKey, since);
  }

  @Public()
  @Post('voice/inbound') @HttpCode(200) @Header('Content-Type', 'text/xml') @ApiOperation({ summary: 'Answer an inbound phone call (Twilio, signature verified)' })
  async voiceInbound(
    @Body() d: TwilioVoiceWebhookDto,
    @Headers('x-twilio-signature') signature?: string,
    @Req() req?: RawBodyRequest<Request>,
  ) {
    if (!this.security.verifyTwilioSignature(signature || '', this.publicUrlFor(req), req?.body || {})) {
      throw new UnauthorizedException('Invalid Twilio signature');
    }
    const result = await this.service.handleVoiceInbound(d, req);
    if (result.terminate) return buildHangupTwiml(result.reply);
    const gatherUrl = `${this.publicUrlFor(req).replace('/voice/inbound', '/voice/gather')}?leadId=${encodeURIComponent(result.leadId)}&turn=1`;
    return buildGatherTwiml(result.reply, gatherUrl);
  }

  @Public()
  @Post('voice/gather') @HttpCode(200) @Header('Content-Type', 'text/xml') @ApiOperation({ summary: 'Continue a phone call after the caller speaks (Twilio, signature verified)' })
  async voiceGather(
    @Body() d: TwilioVoiceWebhookDto,
    @Query('leadId') leadId: string,
    @Query('turn') turn: string,
    @Headers('x-twilio-signature') signature?: string,
    @Req() req?: RawBodyRequest<Request>,
  ) {
    if (!this.security.verifyTwilioSignature(signature || '', this.publicUrlFor(req), req?.body || {})) {
      throw new UnauthorizedException('Invalid Twilio signature');
    }

    const turnNumber = parseInt(turn, 10) || 1;
    if (turnNumber >= MAX_VOICE_TURNS) {
      return buildHangupTwiml("Let's continue this over text — you'll get a message shortly. Thanks for calling!");
    }

    const result = await this.service.handleVoiceGather(leadId, d.SpeechResult);
    if (result.terminate) return buildHangupTwiml(result.reply);

    const gatherUrl = `${this.publicUrlFor(req).split('?')[0]}?leadId=${encodeURIComponent(leadId)}&turn=${turnNumber + 1}`;
    return buildGatherTwiml(result.reply, gatherUrl);
  }

  @Public()
  @Post('social') @HttpCode(200)
  async socialWebhook(
    @Body() d: GenericWebhookDto,
    @Headers('x-api-key') apiKey?: string,
    @Req() req?: RawBodyRequest<Request>,
  ) {
    if (!this.security.verifyWebhookApiKey(apiKey || '', 'social')) {
      throw new UnauthorizedException('Invalid webhook API key');
    }
    return this.service.handleGeneric('social', 'social_message', d);
  }

  @Public()
  @Post('calls') @HttpCode(200)
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
