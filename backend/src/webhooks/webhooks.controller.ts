import { Controller, Post, Body, HttpCode, Headers, UnauthorizedException, Req, RawBodyRequest } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { WebhooksService } from './webhooks.service';
import { WebhookSecurityService } from '../shared/webhook-security.service';
import { Public } from '../auth/public.decorator';
import { FormWebhookDto, WhatsAppWebhookDto, GenericWebhookDto } from './dto/webhook.dto';

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
