import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class RazorpayService {
  private readonly logger = new Logger(RazorpayService.name);
  private keyId: string | undefined;
  private keySecret: string | undefined;

  constructor(private config: ConfigService) {
    this.keyId = this.config.get<string>('RAZORPAY_KEY_ID');
    this.keySecret = this.config.get<string>('RAZORPAY_KEY_SECRET');
    if (this.keyId && this.keySecret) this.logger.log('Razorpay initialized');
  }

  isConfigured(): boolean {
    return !!(this.keyId && this.keySecret);
  }

  async createOrder(amount: number, currency = 'INR', receipt?: string) {
    if (!this.keyId || !this.keySecret) {
      return { id: `stub_order_${Date.now()}`, amount, currency, receipt, stub: true };
    }
    const auth = Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64');
    const res = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Basic ${auth}` },
      body: JSON.stringify({ amount, currency, receipt }),
    });
    return res.json();
  }

  /**
   * Verify Razorpay webhook signature using the raw body.
   * Uses HMAC-SHA256 of (orderId|paymentId|secret) per Razorpay spec.
   */
  verifyWebhookSignature(rawBody: Buffer, signature: string): boolean {
    const secret = this.keySecret;
    if (!secret) return false;
    const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    try {
      return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
    } catch {
      return false;
    }
  }

  /**
   * Verify the payment signature from Razorpay checkout (post-payment).
   * Signature = HMAC-SHA256(order_id + "|" + payment_id, key_secret)
   */
  verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean {
    if (!this.keySecret) return false;
    const payload = `${orderId}|${paymentId}`;
    const expected = crypto.createHmac('sha256', this.keySecret).update(payload).digest('hex');
    try {
      return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
    } catch {
      return false;
    }
  }

  async handleWebhook(event: any): Promise<{ received: boolean }> {
    this.logger.log(`Razorpay webhook: ${event.event}`);
    switch (event.event) {
      case 'payment.captured':
        this.logger.log(`Payment captured: ${event.payload?.payment?.entity?.id}`);
        break;
      case 'payment.failed':
        this.logger.warn(`Payment failed: ${event.payload?.payment?.entity?.id}`);
        break;
      case 'subscription.activated':
      case 'subscription.cancelled':
        this.logger.log(`Subscription: ${event.event}`);
        break;
    }
    return { received: true };
  }
}
