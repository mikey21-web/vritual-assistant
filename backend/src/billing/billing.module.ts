import { Module } from '@nestjs/common';
import { StripeService } from './stripe.service';
import { RazorpayService } from './razorpay.service';

@Module({
  providers: [StripeService, RazorpayService],
  exports: [StripeService, RazorpayService],
})
export class BillingModule {}
