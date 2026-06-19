import { Controller, Post, Body, HttpCode, Headers, UnauthorizedException, Req, RawBodyRequest } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { WebhooksService } from './webhooks.service';
import { WebhookSecurityService } from '../shared/webhook-security.service';
import { Public } from '../auth/public.decorator';
import { FormWebhookDto, WhatsAppWebhookDto, GenericWebhookDto } from './dto/webhook.dto';

@ApiTags('Webhooks')
@Controller('webhooks')
@Public()
@Throttle({ default: { limit: 60, ttl: 60000 } })
export class WebhooksController {
  constructor(
    private service: WebhooksService,
    private security: WebhookSecurityService,
    private prisma: PrismaService,
  ) {}

  private async resolveTenant(apiKey: string, tenantIdHeader?: string): Promise<string | null> {
    if (tenantIdHeader) return tenantIdHeader;

    if (!apiKey) return null;

    const integration = await this.prisma.integration.findFirst({
      where: { config: { path: ['apiKey'], equals: apiKey } },
      select: { tenantId: true },
    });
    return integration?.tenantId ?? null;
  }

  @Post('forms') @HttpCode(200) @ApiOperation({ summary: 'Receive form submission webhook (API key auth)' })
  async formWebhook(
    @Body() d: FormWebhookDto,
    @Headers('x-api-key') apiKey?: string,
    @Headers('x-tenant-id') tenantIdHeader?: string,
  ) {
    if (!this.security.verifyWebhookApiKey(apiKey || '', 'forms')) {
      throw new UnauthorizedException('Invalid webhook API key');
    }
    const tenantId = d.tenantId || (await this.resolveTenant(apiKey || '', tenantIdHeader));
    return this.service.handleFormSubmit('external', d, tenantId);
  }

  @Post('whatsapp') @HttpCode(200) @ApiOperation({ summary: 'Receive WhatsApp webhook (signature verified)' })
  async whatsappWebhook(
    @Body() d: WhatsAppWebhookDto,
    @Headers('x-hub-signature-256') signature?: string,
    @Headers('x-tenant-id') tenantIdHeader?: string,
    @Req() req?: RawBodyRequest<Request>,
  ) {
    const rawBody = req?.rawBody ?? Buffer.from(JSON.stringify(d));
    if (!this.security.verifyWhatsAppSignature(signature || '', rawBody)) {
      throw new UnauthorizedException('Invalid WhatsApp signature');
    }
    const tenantId = tenantIdHeader || null;
    return this.service.handleWhatsApp('whatsapp', d, tenantId);
  }

  @Post('social') @HttpCode(200)
  async socialWebhook(
    @Body() d: GenericWebhookDto,
    @Headers('x-api-key') apiKey?: string,
    @Headers('x-tenant-id') tenantIdHeader?: string,
  ) {
    if (!this.security.verifyWebhookApiKey(apiKey || '', 'social')) {
      throw new UnauthorizedException('Invalid webhook API key');
    }
    const tenantId = await this.resolveTenant(apiKey || '', tenantIdHeader);
    return this.service.handleGeneric('social', 'social_message', d);
  }

  @Post('calls') @HttpCode(200)
  async callWebhook(
    @Body() d: GenericWebhookDto,
    @Headers('x-api-key') apiKey?: string,
    @Headers('x-tenant-id') tenantIdHeader?: string,
  ) {
    if (!this.security.verifyWebhookApiKey(apiKey || '', 'calls')) {
      throw new UnauthorizedException('Invalid webhook API key');
    }
    const tenantId = await this.resolveTenant(apiKey || '', tenantIdHeader);
    return this.service.handleGeneric('phone', 'phone_call', d);
  }

  @Post('payments') @HttpCode(200) @ApiOperation({ summary: 'Receive payment webhook (Stripe-style sig verified)' })
  async paymentWebhook(
    @Body() d: GenericWebhookDto,
    @Headers('stripe-signature') signature?: string,
    @Headers('x-tenant-id') tenantIdHeader?: string,
    @Req() req?: RawBodyRequest<Request>,
  ) {
    const rawBody = req?.rawBody ?? Buffer.from(JSON.stringify(d));
    if (!this.security.verifyStripeSignature(signature || '', rawBody)) {
      throw new UnauthorizedException('Invalid payment signature');
    }
    const tenantId = tenantIdHeader || null;
    return this.service.handlePayment('payment', d);
  }

  @Post('chatbot') @HttpCode(200)
  async chatbotWebhook(
    @Body() d: GenericWebhookDto,
    @Headers('x-api-key') apiKey?: string,
    @Headers('x-tenant-id') tenantIdHeader?: string,
  ) {
    if (!this.security.verifyWebhookApiKey(apiKey || '', 'chatbot')) {
      throw new UnauthorizedException('Invalid webhook API key');
    }
    const tenantId = await this.resolveTenant(apiKey || '', tenantIdHeader);
    return this.service.handleGeneric('chatbot', 'chatbot_message', d);
  }

  @Post('mobile-app') @HttpCode(200)
  async mobileAppWebhook(
    @Body() d: GenericWebhookDto,
    @Headers('x-api-key') apiKey?: string,
    @Headers('x-tenant-id') tenantIdHeader?: string,
  ) {
    if (!this.security.verifyWebhookApiKey(apiKey || '', 'mobile-app')) {
      throw new UnauthorizedException('Invalid webhook API key');
    }
    const tenantId = await this.resolveTenant(apiKey || '', tenantIdHeader);
    return this.service.handleGeneric('mobile-app', 'app_event', d);
  }
}
