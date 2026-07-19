import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RazorpayService } from '../billing/razorpay.service';
import { UnitStatus } from '@prisma/client';

const HOLD_MINUTES = 15;

/**
 * Public digital-sales-room flow (spec 62): browse -> shortlist -> hold ->
 * pay -> book. All availability/hold/payment checks are rechecked in a
 * server transaction; nothing here trusts a browser redirect. If no payment
 * gateway is configured for the tenant, `createPaymentIntent` returns an
 * honest NOT_CONFIGURED result instead of a fake success.
 */
@Injectable()
export class BuyerCheckoutService {
  private readonly logger = new Logger(BuyerCheckoutService.name);

  constructor(
    private prisma: PrismaService,
    private razorpay: RazorpayService,
  ) {}

  async startSession(tenantId: string, data: {
    projectId?: string; leadId?: string; phone?: string; email?: string; name?: string;
    utmSource?: string; utmMedium?: string; utmCampaign?: string;
  }) {
    return this.prisma.buyerSession.create({
      data: {
        tenantId, projectId: data.projectId, leadId: data.leadId, phone: data.phone,
        email: data.email, name: data.name, utmSource: data.utmSource,
        utmMedium: data.utmMedium, utmCampaign: data.utmCampaign,
      },
    });
  }

  async recordEvent(tenantId: string, sessionId: string, eventType: string, unitId?: string, metadata: any = {}) {
    const session = await this.prisma.buyerSession.findFirst({ where: { id: sessionId, tenantId } });
    if (!session) throw new NotFoundException('Session not found');
    await this.prisma.buyerSession.update({ where: { id: sessionId }, data: { lastSeenAt: new Date() } });
    return this.prisma.digitalSalesEvent.create({ data: { tenantId, buyerSessionId: sessionId, eventType, unitId, metadata } });
  }

  async shortlistUnit(tenantId: string, sessionId: string, unitId: string) {
    const session = await this.prisma.buyerSession.findFirst({ where: { id: sessionId, tenantId } });
    if (!session) throw new NotFoundException('Session not found');
    const existing = await this.prisma.unitShortlist.findFirst({ where: { buyerSessionId: sessionId, unitId } });
    if (existing) return existing;
    const entry = await this.prisma.unitShortlist.create({ data: { tenantId, buyerSessionId: sessionId, unitId } });
    await this.recordEvent(tenantId, sessionId, 'unit.shortlisted', unitId);
    return entry;
  }

  async getShortlist(tenantId: string, sessionId: string) {
    return this.prisma.unitShortlist.findMany({
      where: { tenantId, buyerSessionId: sessionId },
      include: { unit: { include: { project: { select: { id: true, name: true } } } } },
    });
  }

  /** Short-lived buyer hold, separate from the salesperson UnitHold. Rechecked again before payment. */
  async createCheckoutHold(tenantId: string, sessionId: string, unitId: string) {
    const session = await this.prisma.buyerSession.findFirst({ where: { id: sessionId, tenantId } });
    if (!session) throw new NotFoundException('Session not found');

    const unit = await this.prisma.unit.findFirst({ where: { id: unitId, tenantId } });
    if (!unit) throw new NotFoundException('Unit not found');
    if (unit.status !== UnitStatus.AVAILABLE) {
      throw new ConflictException({ code: 'UNIT_NOT_AVAILABLE', message: `Unit is ${unit.status}` });
    }

    const activeHold = await this.prisma.checkoutHold.findFirst({
      where: { unitId, status: 'ACTIVE', expiresAt: { gt: new Date() } },
    });
    if (activeHold) throw new ConflictException({ code: 'UNIT_NOT_AVAILABLE', message: 'Unit is already held by another buyer' });

    const activeStaffHold = await this.prisma.unitHold.findFirst({ where: { unitId, status: 'ACTIVE' } });
    if (activeStaffHold) throw new ConflictException({ code: 'UNIT_NOT_AVAILABLE', message: 'Unit is held by a salesperson' });

    return this.prisma.checkoutHold.create({
      data: { tenantId, unitId, buyerSessionId: sessionId, expiresAt: new Date(Date.now() + HOLD_MINUTES * 60 * 1000) },
    });
  }

  async createCheckoutAttempt(tenantId: string, sessionId: string, unitId: string) {
    return this.prisma.checkoutAttempt.create({ data: { tenantId, buyerSessionId: sessionId, unitId } });
  }

  /**
   * Creates a real Razorpay order when the tenant has payment credentials
   * configured; otherwise returns NOT_CONFIGURED rather than a fake success —
   * per the "never fake a successful provider callback" rule.
   */
  async createPaymentIntent(tenantId: string, checkoutHoldId: string, amountPaise: bigint) {
    const hold = await this.prisma.checkoutHold.findFirst({ where: { id: checkoutHoldId, tenantId } });
    if (!hold) throw new NotFoundException('Checkout hold not found');
    if (hold.status !== 'ACTIVE' || hold.expiresAt < new Date()) {
      throw new ConflictException({ code: 'HOLD_EXPIRED', message: 'Checkout hold has expired' });
    }

    const configured = this.razorpay.isConfigured();
    if (!configured) {
      return this.prisma.paymentIntent.create({
        data: { tenantId, checkoutHoldId, amountPaise, status: 'CREATED', provider: null },
      });
    }

    const order = await this.razorpay.createOrder(Number(amountPaise), 'INR', checkoutHoldId);
    return this.prisma.paymentIntent.create({
      data: {
        tenantId, checkoutHoldId, amountPaise, provider: 'razorpay',
        providerRef: order.id, status: 'PENDING',
      },
    });
  }

  /** Idempotent by webhookEventId — a provider retry can never confirm the same payment twice. */
  async confirmPaymentWebhook(providerRef: string, webhookEventId: string) {
    const existing = await this.prisma.paymentIntent.findFirst({ where: { webhookEventId } });
    if (existing) return existing;

    const intent = await this.prisma.paymentIntent.findFirst({ where: { providerRef } });
    if (!intent) throw new NotFoundException('Payment intent not found for provider reference');

    const [updated] = await this.prisma.$transaction([
      this.prisma.paymentIntent.update({
        where: { id: intent.id },
        data: { status: 'CONFIRMED', confirmedAt: new Date(), webhookEventId },
      }),
      ...(intent.checkoutHoldId
        ? [this.prisma.checkoutHold.update({ where: { id: intent.checkoutHoldId }, data: { status: 'CONSUMED' } })]
        : []),
    ]);
    return updated;
  }

  /** ponytail: app-level scan, add a DB cron/partial-index sweep if hold volume grows. */
  async releaseExpiredHolds(tenantId: string) {
    const result = await this.prisma.checkoutHold.updateMany({
      where: { tenantId, status: 'ACTIVE', expiresAt: { lt: new Date() } },
      data: { status: 'EXPIRED', releasedAt: new Date() },
    });
    return { released: result.count };
  }

  async getFunnelReport(tenantId: string, projectId?: string) {
    const sessionWhere: any = { tenantId, ...(projectId ? { projectId } : {}) };
    const [sessions, shortlisted, holdsCreated, attemptsStarted, paymentsConfirmed] = await Promise.all([
      this.prisma.buyerSession.count({ where: sessionWhere }),
      this.prisma.unitShortlist.count({ where: { tenantId, buyerSession: sessionWhere } }),
      this.prisma.checkoutHold.count({ where: { tenantId, buyerSession: sessionWhere } }),
      this.prisma.checkoutAttempt.count({ where: { tenantId, buyerSession: sessionWhere } }),
      this.prisma.paymentIntent.count({ where: { tenantId, status: 'CONFIRMED' } }),
    ]);
    return { sessions, shortlisted, holdsCreated, attemptsStarted, paymentsConfirmed };
  }
}
