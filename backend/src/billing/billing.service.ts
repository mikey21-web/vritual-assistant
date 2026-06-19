import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentProvider, PaymentProviderConfig, BillingPlan, UsageRecord } from './payment-provider.interface';
import { StripeProvider } from './stripe.provider';
import { RazorpayProvider } from './razorpay.provider';

export const PLANS: BillingPlan[] = [
  { id: 'starter', name: 'Starter', amount: 2999, currency: 'INR', interval: 'month', features: { maxLeads: 500, maxMessages: 1000, maxAgentRuns: 500, maxSeats: 2 } },
  { id: 'growth', name: 'Growth', amount: 7999, currency: 'INR', interval: 'month', features: { maxLeads: 2000, maxMessages: 5000, maxAgentRuns: 2000, maxSeats: 5 } },
  { id: 'pro', name: 'Pro', amount: 19999, currency: 'INR', interval: 'month', features: { maxLeads: 10000, maxMessages: 25000, maxAgentRuns: 10000, maxSeats: 15 } },
  { id: 'enterprise', name: 'Enterprise', amount: 49999, currency: 'INR', interval: 'month', features: { maxLeads: -1, maxMessages: -1, maxAgentRuns: -1, maxSeats: -1 } },
];

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private provider: PaymentProvider;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private stripeProvider: StripeProvider,
    private razorpayProvider: RazorpayProvider,
  ) {
    const preferred = this.config.get<string>('PAYMENT_PROVIDER', 'razorpay');
    this.provider = preferred === 'stripe' ? this.stripeProvider : this.razorpayProvider;
    this.logger.log(`Using payment provider: ${this.provider.name}`);
  }

  getPlans(): BillingPlan[] { return PLANS; }

  async createSubscription(planId: string, customerEmail: string, customerName: string, returnUrl: string) {
    const plan = PLANS.find(p => p.id === planId);
    if (!plan) throw new Error(`Plan not found: ${planId}`);
    return this.provider.createSubscription({ planId, customerEmail, customerName, returnUrl });
  }

  async cancelSubscription(providerSubscriptionId: string) {
    await this.provider.cancelSubscription(providerSubscriptionId);
  }

  async handleWebhook(provider: string, payload: any, signature: string) {
    const p = provider === 'stripe' ? this.stripeProvider : this.razorpayProvider;
    return p.handleWebhook(payload, signature);
  }

  async getUsage(): Promise<UsageRecord> {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const [leads, outboundMessages, agentRuns] = await Promise.all([
      this.prisma.lead.count({ where: { createdAt: { gte: periodStart } } }),
      this.prisma.conversationMessage.count({ where: { direction: 'OUTBOUND', createdAt: { gte: periodStart } } }),
      // Agent runs would come from a RunRecord model or agent logs
      Promise.resolve(0),
    ]);

    return { leads, outboundMessages, agentRuns, periodStart, periodEnd };
  }

  async checkQuota(action: 'lead' | 'message' | 'agent_run'): Promise<{ allowed: boolean; used: number; limit: number }> {
    const usage = await this.getUsage();
    // For now, use a generous default plan
    const plan = PLANS[2]; // Pro
    const limits = { lead: plan.features.maxLeads, message: plan.features.maxMessages, agent_run: plan.features.maxAgentRuns };
    const used = { lead: usage.leads, message: usage.outboundMessages, agent_run: usage.agentRuns };
    const limit = limits[action];
    if (limit === -1) return { allowed: true, used: used[action], limit };
    return { allowed: used[action] < limit, used: used[action], limit };
  }
}
