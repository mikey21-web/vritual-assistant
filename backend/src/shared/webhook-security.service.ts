import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class WebhookSecurityService {
  constructor(private config: ConfigService) {}

  verifyWhatsAppSignature(signature: string, rawBody: Buffer): boolean {
    // Support multiple secrets for rotation: WHATSAPP_APP_SECRET=secret1,secret2
    const appSecrets = (this.config.get<string>('WHATSAPP_APP_SECRET') || '').split(',').filter(Boolean);
    return appSecrets.some(secret => {
      const hmac = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
      const expected = `sha256=${hmac}`;
      try {
        return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
      } catch {
        return false;
      }
    });
  }

  verifyStripeSignature(signature: string, rawBody: Buffer): boolean {
    // Support multiple secrets for rotation: STRIPE_WEBHOOK_SECRET=secret1,secret2
    const secrets = (this.config.get<string>('STRIPE_WEBHOOK_SECRET') || '').split(',').filter(Boolean);
    return secrets.some(secret => {
      try {
        const parts = signature.split(',').reduce((acc: any, part: string) => {
          const [k, v] = part.split('=');
          acc[k.trim()] = v.trim();
          return acc;
        }, {});
        const timestamp = parseInt(parts.t, 10);
        const now = Math.floor(Date.now() / 1000);
        if (Math.abs(now - timestamp) > 300) return false;
        const expected = crypto.createHmac('sha256', secret).update(`${parts.t}.${rawBody.toString('utf8')}`).digest('hex');
        if (expected.length !== parts.v1?.length) return false;
        return crypto.timingSafeEqual(Buffer.from(parts.v1), Buffer.from(expected));
      } catch {
        return false;
      }
    });
  }

  verifyGenericSignature(providerSecret: string, signature: string, rawBody: string): boolean {
    if (!providerSecret) return false;
    const expected = crypto.createHmac('sha256', providerSecret).update(rawBody).digest('hex');
    try {
      if (expected.length !== signature.length) return false;
      return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    } catch {
      return false;
    }
  }

  /** DocuSign Connect uses HMAC-SHA256 (base64), not the hex scheme the other providers use. Rotation via comma-separated DOCUSIGN_CONNECT_HMAC_KEY. */
  verifyDocuSignConnectSignature(signature: string, rawBody: Buffer): boolean {
    const keys = (this.config.get<string>('DOCUSIGN_CONNECT_HMAC_KEY') || '').split(',').filter(Boolean);
    if (!signature || keys.length === 0) return false;
    return keys.some(key => {
      const expected = crypto.createHmac('sha256', key).update(rawBody).digest('base64');
      try {
        return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
      } catch {
        return false;
      }
    });
  }

  verifyWebhookApiKey(key: string, expectedRoute: string): boolean {
    const globalKeys = (this.config.get<string>('WEBHOOK_API_KEYS') || '').split(',').filter(Boolean);
    const routeKey = this.config.get<string>(`WEBHOOK_API_KEY_${expectedRoute.toUpperCase().replace(/-/g, '_')}`);
    const validKeys = [...globalKeys];
    if (routeKey) validKeys.push(routeKey);
    if (validKeys.length === 0 && !key) return false;
    return validKeys.some(k => {
      try {
        if (k.length !== key.length) return false;
        return crypto.timingSafeEqual(Buffer.from(k), Buffer.from(key));
      } catch {
        return false;
      }
    });
  }
}
