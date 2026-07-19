import { Module } from '@nestjs/common';
import { BuyerCheckoutService } from './buyer-checkout.service';
import { BuyerCheckoutController } from './buyer-checkout.controller';
import { RazorpayService } from '../billing/razorpay.service';

@Module({
  controllers: [BuyerCheckoutController],
  providers: [BuyerCheckoutService, RazorpayService],
  exports: [BuyerCheckoutService],
})
export class BuyerCheckoutModule {}
