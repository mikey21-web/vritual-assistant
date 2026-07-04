import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { OutboxService } from '../shared/outbox.service';

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private stripe: any = null;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
    private outbox: OutboxService,
  ) {
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

  async createCheckoutSession(
    plan: { id: string; name: string; amount: number; currency: string },
    customerId?: string,
    userId?: string,
  ) {
    if (!this.stripe) return { url: `?session_id=stub_${plan.id}`, sessionId: `stub_${plan.id}` };

    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: plan.currency || 'usd',
          product_data: { name: plan.name },
          unit_amount: plan.amount,
        },
        quantity: 1,
      }],
      ...(customerId ? { customer: customerId } : {}),
      ...(userId ? { client_reference_id: userId } : {}),
      metadata: { planId: plan.id },
      success_url: `${this.config.get<string>('DASHBOARD_URL', 'http://localhost:3000')}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${this.config.get<string>('DASHBOARD_URL', 'http://localhost:3000')}/billing/cancel`,
    });

    return { url: session.url, sessionId: session.id };
  }

  async constructWebhookEvent(payload: Buffer, sig: string) {
    if (!this.stripe) return { type: 'stub', data: { object: { id: 'stub' } } };
    return this.stripe.webhooks.constructEvent(
      payload,
      sig,
      this.config.get<string>('STRIPE_WEBHOOK_SECRET'),
    );
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
      default:
        this.logger.log(`Unhandled event type: ${event.type}`);
    }
    return { received: true };
  }

  // ---------------------------------------------------------------------------
  // Webhook Handlers
  // ---------------------------------------------------------------------------

  private async handleCheckoutCompleted(session: any) {
    this.logger.log(`Checkout completed: ${session.id}, customer: ${session.customer}`);

    const userId = session.client_reference_id;
    if (!userId) {
      this.logger.warn('No client_reference_id on session — cannot link subscription to a user');
      return;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, tenantId: true, email: true, name: true },
    });
    if (!user) {
      this.logger.warn(`User ${userId} not found — skipping subscription creation`);
      return;
    }

    const planId = session.metadata?.planId || 'starter';

    // Build subscription data from the Stripe session
    const subData = {
      tenantId: user.tenantId,
      planId,
      stripeCustomerId: session.customer,
      stripeSubscriptionId: session.subscription,
      status: 'active' as const,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 days
    };

    // Upsert — one subscription per tenant
    const existing = await this.prisma.subscription.findFirst({
      where: { tenantId: user.tenantId },
    });

    if (existing) {
      await this.prisma.subscription.update({ where: { id: existing.id }, data: subData });
    } else {
      await this.prisma.subscription.create({ data: subData });
    }

    // Bump the tenant's plan
    await this.prisma.tenant.update({
      where: { id: user.tenantId },
      data: { plan: planId },
    });

    // Send a confirmation message
    const contact = await this.prisma.contact.findFirst({
      where: { tenantId: user.tenantId, email: user.email },
    });

    const confirmText =
      `✅ Payment successful! Your **${planId.toUpperCase()}** subscription is now active. ` +
      `Thank you for choosing our service.`;

    if (contact?.whatsapp) {
      await this.outbox.enqueue({
        channel: 'WHATSAPP',
        recipient: contact.whatsapp,
        text: confirmText,
        contactId: contact.id,
      });
    }

    this.logger.log(`Subscription activated for tenant ${user.tenantId} (plan: ${planId})`);
  }

  private async handleInvoicePaid(invoice: any) {
    this.logger.log(`Invoice paid: ${invoice.id}, amount: ${invoice.amount_paid}`);

    const stripeSubId = invoice.subscription;
    if (!stripeSubId) return;

    const sub = await this.prisma.subscription.findFirst({
      where: { stripeSubscriptionId: stripeSubId },
    });
    if (!sub) {
      this.logger.warn(`No local subscription found for Stripe sub ${stripeSubId}`);
      return;
    }

    // Extend the period by 30 days from the current period end (or now)
    const base = sub.currentPeriodEnd || new Date();
    const newPeriodEnd = new Date(base.getTime() + 30 * 24 * 60 * 60 * 1000);

    await this.prisma.subscription.update({
      where: { id: sub.id },
      data: { status: 'active', currentPeriodEnd: newPeriodEnd },
    });

    this.logger.log(`Subscription ${sub.id} period extended to ${newPeriodEnd.toISOString()}`);
  }

  private async handlePaymentFailed(invoice: any) {
    this.logger.warn(`Payment failed: ${invoice.id}`);

    const stripeSubId = invoice.subscription;
    if (!stripeSubId) return;

    const sub = await this.prisma.subscription.findFirst({
      where: { stripeSubscriptionId: stripeSubId },
    });
    if (!sub) return;

    await this.prisma.subscription.update({
      where: { id: sub.id },
      data: { status: 'past_due' },
    });

    // Notify the tenant's owners & admins
    const admins = await this.prisma.user.findMany({
      where: { tenantId: sub.tenantId, role: { in: ['OWNER', 'ADMIN'] } },
      select: { email: true, name: true },
    });

    for (const admin of admins) {
      this.logger.warn(`[PAYMENT FAILED] Notifying ${admin.email} for tenant ${sub.tenantId}`);
      // In production, enqueue an email via EmailAdapter here
    }
  }

  private async handleSubscriptionDeleted(subscription: any) {
    this.logger.log(`Subscription deleted: ${subscription.id}`);

    const sub = await this.prisma.subscription.findFirst({
      where: { stripeSubscriptionId: subscription.id },
    });
    if (!sub) return;

    await this.prisma.subscription.update({
      where: { id: sub.id },
      data: { status: 'canceled', canceledAt: new Date() },
    });

    // Downgrade the tenant to the free / starter tier
    await this.prisma.tenant.update({
      where: { id: sub.tenantId },
      data: { plan: 'starter' },
    });

    this.logger.log(`Tenant ${sub.tenantId} downgraded to starter after subscription cancellation`);
  }
}
