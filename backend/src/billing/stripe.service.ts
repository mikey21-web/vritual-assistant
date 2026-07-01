import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private stripe: any = null;

  constructor(private config: ConfigService) {
    const key = this.config.get<string>('STRIPE_SECRET_KEY');
    if (key) {
      try {
        this.stripe = require('stripe')(key);
        this.logger.log('Stripe initialized');
      } catch (e: any) {
        this.logger.warn(`Stripe init failed: ${e.message}`);
      }
    }
  }

  async createCheckoutSession(plan: { id: string; name: string; amount: number; currency: string }, customerId?: string) {
    if (!this.stripe) return { url: `?session_id=stub_${plan.id}`, sessionId: `stub_${plan.id}` };

    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price_data: { currency: plan.currency || 'usd', product_data: { name: plan.name }, unit_amount: plan.amount }, quantity: 1 }],
      ...(customerId ? { customer: customerId } : {}),
      success_url: `${this.config.get<string>('DASHBOARD_URL', 'http://localhost:3000')}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${this.config.get<string>('DASHBOARD_URL', 'http://localhost:3000')}/billing/cancel`,
    });

    return { url: session.url, sessionId: session.id };
  }

  async constructWebhookEvent(payload: Buffer, sig: string) {
    if (!this.stripe) return { type: 'stub', data: { object: { id: 'stub' } } };
    return this.stripe.webhooks.constructEvent(payload, sig, this.config.get<string>('STRIPE_WEBHOOK_SECRET'));
  }

  async handleWebhook(event: any): Promise<{ received: boolean }> {
    this.logger.log(`Stripe webhook received: ${event.type}`);
    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(event.data.object);
        break;
      case 'invoice.paid':
        await this.handleInvoicePaid(event.data.object);
        break;
      case 'invoice.payment_failed':
        await this.handlePaymentFailed(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object);
        break;
    }
    return { received: true };
  }

  private async handleCheckoutCompleted(session: any) {
    this.logger.log(`Checkout completed: ${session.id}, customer: ${session.customer}`);
  }

  private async handleInvoicePaid(invoice: any) {
    this.logger.log(`Invoice paid: ${invoice.id}, amount: ${invoice.amount_paid}`);
  }

  private async handlePaymentFailed(invoice: any) {
    this.logger.warn(`Payment failed: ${invoice.id}`);
  }

  private async handleSubscriptionDeleted(subscription: any) {
    this.logger.log(`Subscription deleted: ${subscription.id}`);
  }
}
