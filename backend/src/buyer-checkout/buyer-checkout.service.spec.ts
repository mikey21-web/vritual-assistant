import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { BuyerCheckoutService } from './buyer-checkout.service';
import { PrismaService } from '../prisma/prisma.service';
import { RazorpayService } from '../billing/razorpay.service';

describe('BuyerCheckoutService', () => {
  let service: BuyerCheckoutService;
  let prisma: any;
  let razorpay: any;

  beforeEach(async () => {
    prisma = {
      buyerSession: { findFirst: jest.fn().mockResolvedValue({ id: 's1', tenantId: 't1' }), create: jest.fn(), update: jest.fn() },
      unit: { findFirst: jest.fn().mockResolvedValue({ id: 'u1', tenantId: 't1', status: 'AVAILABLE' }) },
      checkoutHold: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'ch-1', status: 'ACTIVE', ...data })),
        update: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
      unitHold: { findFirst: jest.fn().mockResolvedValue(null) },
      unitShortlist: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn(), findMany: jest.fn() },
      digitalSalesEvent: { create: jest.fn() },
      paymentIntent: {
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'pi-1', ...data })),
        findFirst: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      checkoutAttempt: { create: jest.fn(), count: jest.fn() },
      $transaction: jest.fn().mockImplementation((ops: any[]) => Promise.all(ops)),
    };
    razorpay = { isConfigured: jest.fn().mockReturnValue(false), createOrder: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BuyerCheckoutService,
        { provide: PrismaService, useValue: prisma },
        { provide: RazorpayService, useValue: razorpay },
      ],
    }).compile();

    service = module.get(BuyerCheckoutService);
  });

  it('rejects a checkout hold when the unit is not AVAILABLE', async () => {
    prisma.unit.findFirst.mockResolvedValueOnce({ id: 'u1', tenantId: 't1', status: 'BOOKED' });
    await expect(service.createCheckoutHold('t1', 's1', 'u1')).rejects.toThrow(ConflictException);
  });

  it('rejects a checkout hold when another buyer already holds the unit', async () => {
    prisma.checkoutHold.findFirst.mockResolvedValueOnce({ id: 'other', status: 'ACTIVE', expiresAt: new Date(Date.now() + 60000) });
    await expect(service.createCheckoutHold('t1', 's1', 'u1')).rejects.toThrow(ConflictException);
  });

  it('creates a NOT_CONFIGURED payment intent when no gateway is set up', async () => {
    prisma.checkoutHold.findFirst.mockResolvedValueOnce({ id: 'ch-1', tenantId: 't1', status: 'ACTIVE', expiresAt: new Date(Date.now() + 60000) });
    const intent = await service.createPaymentIntent('t1', 'ch-1', 100000n);
    expect(intent.provider).toBeNull();
    expect(intent.status).toBe('CREATED');
    expect(razorpay.createOrder).not.toHaveBeenCalled();
  });

  it('is idempotent on webhook confirmation by webhookEventId', async () => {
    prisma.paymentIntent.findFirst.mockResolvedValueOnce({ id: 'pi-1', webhookEventId: 'evt-1', status: 'CONFIRMED' });
    const result = await service.confirmPaymentWebhook('order-1', 'evt-1');
    expect(result.status).toBe('CONFIRMED');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
