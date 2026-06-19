import { Module } from '@nestjs/common';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';
import { StripeProvider } from './stripe.provider';
import { RazorpayProvider } from './razorpay.provider';

@Module({
  controllers: [BillingController],
  providers: [BillingService, StripeProvider, RazorpayProvider],
  exports: [BillingService],
})
export class BillingModule {}
