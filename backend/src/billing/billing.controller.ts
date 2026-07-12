import { Controller, Get, Post, Body, Headers, Param, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { BillingService } from './billing.service';
import { Roles } from '../auth/roles.decorator';
import { Public } from '../auth/public.decorator';

@ApiTags('Billing')
@Controller('billing')
@ApiBearerAuth()
export class BillingController {
  constructor(private service: BillingService) {}

  @Get('plans') getPlans() { return this.service.getPlans(); }

  @Post('subscribe') @Roles('OWNER', 'ADMIN')
  subscribe(@Body() dto: { planId: string; customerEmail: string; customerName: string; returnUrl: string }) {
    return this.service.createSubscription(dto.planId, dto.customerEmail, dto.customerName, dto.returnUrl);
  }

  @Post('cancel') @Roles('OWNER', 'ADMIN')
  cancel(@Body('subscriptionId') subscriptionId: string) {
    return this.service.cancelSubscription(subscriptionId);
  }

  // Stripe/Razorpay call this directly, with no JWT — only their own signature header.
  // Without @Public() this route inherits the global JwtAuthGuard and would 401 every
  // real webhook delivery, silently breaking subscription status sync.
  @Public()
  @Post('webhook/:provider')
  webhook(@Param('provider') provider: string, @Body() payload: any, @Headers('x-provider-signature') sig: string) {
    return this.service.handleWebhook(provider, payload, sig);
  }

  @Get('usage') @Roles('OWNER', 'ADMIN', 'MANAGER')
  getUsage(@Req() req: any) { return this.service.getUsage(req); }

  @Get('quota/:action') @Roles('OWNER', 'ADMIN', 'MANAGER')
  checkQuota(@Param('action') action: 'lead' | 'message' | 'agent_run', @Req() req: any) { return this.service.checkQuota(action, req); }
}
