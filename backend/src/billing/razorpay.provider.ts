import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentProvider, CreateSubscriptionDto, SubscriptionResult, BillingPlan } from './payment-provider.interface';
import * as crypto from 'crypto';

@Injectable()
export class RazorpayProvider implements PaymentProvider {
  name = 'razorpay';

  constructor(private config: ConfigService) {}

  async createSubscription(dto: CreateSubscriptionDto): Promise<SubscriptionResult> {
    // Real implementation uses Razorpay SDK
    return { providerSubscriptionId: `rzp_${Date.now()}`, status: 'created', checkoutUrl: `https://rzp.io/i/${dto.planId}` };
  }

  async cancelSubscription(providerSubscriptionId: string): Promise<void> {
    // await razorpay.subscriptions.cancel(providerSubscriptionId);
  }

  async getSubscriptionStatus(providerSubscriptionId: string): Promise<string> {
    return 'active';
  }

  async handleWebhook(payload: any, signature: string): Promise<{ event: string; subscriptionId: string; status: string }> {
    const secret = this.config.get<string>('RAZORPAY_WEBHOOK_SECRET') || '';
    const expectedSig = crypto.createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');
    if (signature !== expectedSig) throw new Error('Invalid Razorpay webhook signature');
    const event = payload?.event || 'unknown';
    const subscriptionId = payload?.payload?.subscription?.entity?.id || '';
    return { event, subscriptionId, status: event.includes('activated') ? 'active' : 'inactive' };
  }

  async createCheckoutSession(plan: BillingPlan, customerEmail: string, returnUrl: string): Promise<{ url: string }> {
    return { url: `${returnUrl}?plan=${plan.id}&provider=razorpay` };
  }
}
