export interface PaymentProviderConfig {
  apiKey: string;
  apiSecret: string;
  webhookSecret: string;
}

export interface CreateSubscriptionDto {
  planId: string;
  customerEmail: string;
  customerName: string;
  returnUrl: string;
}

export interface SubscriptionResult {
  providerSubscriptionId: string;
  status: string;
  checkoutUrl?: string;
}

export interface BillingPlan {
  id: string;
  name: string;
  amount: number;
  currency: string;
  interval: 'month' | 'year';
  features: {
    maxLeads: number;
    maxMessages: number;
    maxAgentRuns: number;
    maxSeats: number;
  };
}

export interface UsageRecord {
  leads: number;
  outboundMessages: number;
  agentRuns: number;
  periodStart: Date;
  periodEnd: Date;
}

export interface PaymentProvider {
  name: string;
  createSubscription(dto: CreateSubscriptionDto): Promise<SubscriptionResult>;
  cancelSubscription(providerSubscriptionId: string): Promise<void>;
  getSubscriptionStatus(providerSubscriptionId: string): Promise<string>;
  handleWebhook(payload: any, signature: string): Promise<{ event: string; subscriptionId: string; status: string }>;
  createCheckoutSession(plan: BillingPlan, customerEmail: string, returnUrl: string): Promise<{ url: string }>;
}
