import { Controller, Post, Body, HttpCode, Headers, UnauthorizedException, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { PortalIntegrationsService } from './portal-integrations.service';
import { Public } from '../auth/public.decorator';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@ApiTags('Portal Integrations')
@Controller('portal-integrations')
export class PortalIntegrationsController {
  private readonly logger = new Logger(PortalIntegrationsController.name);

  constructor(
    private service: PortalIntegrationsService,
    private config: ConfigService,
  ) {}

  private verifyPortalApiKey(apiKey: string | undefined, expectedKey: string | undefined): boolean {
    if (!expectedKey) return true; // No key configured = allow (dev mode)
    return apiKey === expectedKey;
  }

  @Public()
  @Post('indiamart')
  @HttpCode(200)
  @ApiOperation({ summary: 'Receive IndiaMART lead webhook' })
  async indiaMART(
    @Body() body: any,
    @Headers('x-api-key') apiKey?: string,
    @Headers('x-hub-signature-256') signature?: string,
  ) {
    const expectedKey = this.config.get<string>('INDIAMART_WEBHOOK_SECRET');
    if (!this.verifyPortalApiKey(apiKey || signature, expectedKey)) {
      throw new UnauthorizedException('Invalid IndiaMART webhook key');
    }
    return this.service.handleIndiaMART(body);
  }

  @Public()
  @Post('99acres')
  @HttpCode(200)
  @ApiOperation({ summary: 'Receive 99acres lead webhook' })
  async ninetyNineAcres(
    @Body() body: any,
    @Headers('x-api-key') apiKey?: string,
    @Headers('x-hub-signature-256') signature?: string,
  ) {
    const expectedKey = this.config.get<string>('NINETY_NINE_ACRES_WEBHOOK_SECRET');
    if (!this.verifyPortalApiKey(apiKey || signature, expectedKey)) {
      throw new UnauthorizedException('Invalid 99acres webhook key');
    }
    return this.service.handle99Acres(body);
  }

  @Public()
  @Post('justdial')
  @HttpCode(200)
  @ApiOperation({ summary: 'Receive JustDial lead webhook' })
  async justDial(
    @Body() body: any,
    @Headers('x-api-key') apiKey?: string,
    @Headers('x-hub-signature-256') signature?: string,
  ) {
    const expectedKey = this.config.get<string>('JUSTDIAL_WEBHOOK_SECRET');
    if (!this.verifyPortalApiKey(apiKey || signature, expectedKey)) {
      throw new UnauthorizedException('Invalid JustDial webhook key');
    }
    return this.service.handleJustDial(body);
  }

  @Public()
  @Post('magicbricks')
  @HttpCode(200)
  @ApiOperation({ summary: 'Receive MagicBricks lead webhook' })
  async magicBricks(
    @Body() body: any,
    @Headers('x-api-key') apiKey?: string,
    @Headers('x-hub-signature-256') signature?: string,
  ) {
    const expectedKey = this.config.get<string>('MAGICBRICKS_WEBHOOK_SECRET');
    if (!this.verifyPortalApiKey(apiKey || signature, expectedKey)) {
      throw new UnauthorizedException('Invalid MagicBricks webhook key');
    }
    return this.service.handleMagicBricks(body);
  }

  @Public()
  @Post('housing')
  @HttpCode(200)
  @ApiOperation({ summary: 'Receive Housing.com lead webhook' })
  async housing(
    @Body() body: any,
    @Headers('x-api-key') apiKey?: string,
    @Headers('x-hub-signature-256') signature?: string,
  ) {
    const expectedKey = this.config.get<string>('HOUSING_WEBHOOK_SECRET');
    if (!this.verifyPortalApiKey(apiKey || signature, expectedKey)) {
      throw new UnauthorizedException('Invalid Housing.com webhook key');
    }
    return this.service.handleHousing(body);
  }

  @Public()
  @Post('tradeindia')
  @HttpCode(200)
  @ApiOperation({ summary: 'Receive TradeIndia lead webhook' })
  async tradeIndia(
    @Body() body: any,
    @Headers('x-api-key') apiKey?: string,
    @Headers('x-hub-signature-256') signature?: string,
  ) {
    const expectedKey = this.config.get<string>('TRADEINDIA_WEBHOOK_SECRET');
    if (!this.verifyPortalApiKey(apiKey || signature, expectedKey)) {
      throw new UnauthorizedException('Invalid TradeIndia webhook key');
    }
    return this.service.handleTradeIndia(body);
  }
}
