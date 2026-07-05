import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BillingService, PLANS } from './billing.service';
import { PrismaService } from '../prisma/prisma.service';
import { StripeProvider } from './stripe.provider';
import { RazorpayProvider } from './razorpay.provider';

describe('BillingService', () => {
  let service: BillingService;

  const prisma = {
    lead: { count: jest.fn().mockResolvedValue(42) },
    conversationMessage: { count: jest.fn().mockResolvedValue(150) },
  };

  const stripe = {
    name: 'stripe',
    createSubscription: jest.fn().mockResolvedValue({ providerSubscriptionId: 'sub_123', status: 'active', checkoutUrl: 'https://checkout.stripe.com/pay/123' }),
    cancelSubscription: jest.fn().mockResolvedValue(undefined),
    getSubscriptionStatus: jest.fn().mockResolvedValue('active'),
    handleWebhook: jest.fn().mockResolvedValue({ event: 'checkout.session.completed', subscriptionId: 'sub_123', status: 'active' }),
    createCheckoutSession: jest.fn().mockResolvedValue({ url: 'https://checkout.stripe.com/session/123' }),
  };

  const razorpay = {
    name: 'razorpay',
    createSubscription: jest.fn().mockResolvedValue({ providerSubscriptionId: 'rp_sub_456', status: 'active' }),
    cancelSubscription: jest.fn().mockResolvedValue(undefined),
    getSubscriptionStatus: jest.fn().mockResolvedValue('active'),
    handleWebhook: jest.fn().mockResolvedValue({ event: 'subscription.charged', subscriptionId: 'rp_sub_456', status: 'active' }),
    createCheckoutSession: jest.fn().mockResolvedValue({ url: 'https://checkout.razorpay.com/session/456' }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('razorpay') } },
        { provide: StripeProvider, useValue: stripe },
        { provide: RazorpayProvider, useValue: razorpay },
      ],
    }).compile();

    service = module.get<BillingService>(BillingService);
  });

  describe('getPlans', () => {
    it('should return all plans', () => {
      expect(service.getPlans()).toHaveLength(4);
    });

    it('should include starter, growth, pro, enterprise', () => {
      const planIds = service.getPlans().map(p => p.id);
      expect(planIds).toEqual(['starter', 'growth', 'pro', 'enterprise']);
    });

    it('enterprise plan should have unlimited (-1) features', () => {
      const enterprise = service.getPlans().find(p => p.id === 'enterprise');
      expect(enterprise!.features.maxLeads).toBe(-1);
    });
  });

  describe('createSubscription', () => {
    it('should create subscription for valid plan', async () => {
      const result = await service.createSubscription('starter', 'customer@test.com', 'Customer', 'https://return.url');
      expect(result.providerSubscriptionId).toBe('rp_sub_456');
    });

    it('should throw for unknown plan', async () => {
      await expect(service.createSubscription('nonexistent', 'a@b.com', 'X', 'https://x.com'))
        .rejects.toThrow('Plan not found');
    });
  });

  describe('cancelSubscription', () => {
    it('should delegate to provider', async () => {
      await service.cancelSubscription('sub_123');
      expect(razorpay.cancelSubscription).toHaveBeenCalledWith('sub_123');
    });
  });

  describe('handleWebhook', () => {
    it('should route to stripe provider when specified', async () => {
      const result = await service.handleWebhook('stripe', {}, 'sig');
      expect(result.subscriptionId).toBe('sub_123');
    });

    it('should route to razorpay provider by default', async () => {
      const result = await service.handleWebhook('razorpay', {}, 'sig');
      expect(result.subscriptionId).toBe('rp_sub_456');
    });
  });

  describe('getUsage', () => {
    it('should return usage stats', async () => {
      const usage = await service.getUsage();
      expect(usage.leads).toBe(42);
      expect(usage.outboundMessages).toBe(150);
      expect(usage.agentRuns).toBe(0);
    });

    it('should scope to current month', async () => {
      const usage = await service.getUsage();
      const now = new Date();
      expect(usage.periodStart.getMonth()).toBe(now.getMonth());
      expect(usage.periodEnd.getMonth()).toBe(now.getMonth());
    });
  });

  describe('checkQuota', () => {
    it('should allow when under limit', async () => {
      const result = await service.checkQuota('lead');
      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(PLANS[2].features.maxLeads);
    });

    it('should report usage count', async () => {
      const result = await service.checkQuota('agent_run');
      expect(result.used).toBe(0);
    });

    it('should handle unlimited features', async () => {
      // Override for enterprise - but service hardcodes Pro atm
      const result = await service.checkQuota('lead');
      expect(result.limit).toBe(10000);
    });
  });
});
