import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { StripeProvider } from './stripe.provider';
import { RazorpayProvider } from './razorpay.provider';
import { StripeService } from './stripe.service';
import { RazorpayService } from './razorpay.service';

@Module({
  controllers: [BillingController],
  providers: [BillingService, StripeProvider, RazorpayProvider, StripeService, RazorpayService],
  exports: [StripeProvider, RazorpayProvider],
})
export class BillingModule {}