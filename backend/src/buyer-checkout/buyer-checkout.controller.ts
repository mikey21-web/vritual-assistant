import { Controller, Get, Post, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Public } from '../auth/public.decorator';
import { BuyerCheckoutService } from './buyer-checkout.service';

@ApiTags('Buyer Checkout')
@Controller('buyer-checkout')
export class BuyerCheckoutController {
  constructor(private service: BuyerCheckoutService) {}

  // --- Public digital-sales-room endpoints (no staff auth; scoped to a tenant slug in body) ---

  @Public()
  @Post('sessions')
  startSession(@Body() body: any) {
    return this.service.startSession(body.tenantId, body);
  }

  @Public()
  @Post('sessions/:id/events')
  recordEvent(@Param('id') id: string, @Body() body: { tenantId: string; eventType: string; unitId?: string; metadata?: any }) {
    return this.service.recordEvent(body.tenantId, id, body.eventType, body.unitId, body.metadata);
  }

  @Public()
  @Post('sessions/:id/shortlist')
  shortlist(@Param('id') id: string, @Body() body: { tenantId: string; unitId: string }) {
    return this.service.shortlistUnit(body.tenantId, id, body.unitId);
  }

  @Public()
  @Get('sessions/:id/shortlist')
  getShortlist(@Param('id') id: string, @Query('tenantId') tenantId: string) {
    return this.service.getShortlist(tenantId, id);
  }

  @Public()
  @Post('sessions/:id/hold')
  createHold(@Param('id') id: string, @Body() body: { tenantId: string; unitId: string }) {
    return this.service.createCheckoutHold(body.tenantId, id, body.unitId);
  }

  @Public()
  @Post('sessions/:id/attempt')
  createAttempt(@Param('id') id: string, @Body() body: { tenantId: string; unitId: string }) {
    return this.service.createCheckoutAttempt(body.tenantId, id, body.unitId);
  }

  @Public()
  @Post('holds/:id/payment-intent')
  createPaymentIntent(@Param('id') id: string, @Body() body: { tenantId: string; amountPaise: string }) {
    return this.service.createPaymentIntent(body.tenantId, id, BigInt(body.amountPaise));
  }

  @Public()
  @Post('webhook')
  webhook(@Body() body: { providerRef: string; webhookEventId: string }) {
    return this.service.confirmPaymentWebhook(body.providerRef, body.webhookEventId);
  }

  // --- Internal ops endpoints ---

  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Get('funnel')
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  funnel(@Req() req: any, @Query('projectId') projectId?: string) {
    return this.service.getFunnelReport(req.user.tenantId, projectId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Post('holds/release-expired')
  @Roles('OWNER', 'ADMIN')
  releaseExpired(@Req() req: any) {
    return this.service.releaseExpiredHolds(req.user.tenantId);
  }
}
