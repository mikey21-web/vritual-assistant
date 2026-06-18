import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class SignedUrlService {
  constructor(private config: ConfigService) {}

  private getSecret(): string {
    const secret = this.config.get<string>('SIGNED_URL_SECRET') || this.config.get<string>('JWT_SECRET');
    if (!secret) throw new Error('SIGNED_URL_SECRET or JWT_SECRET environment variable is required');
    if (secret === 'dev-secret' || secret === 'change-me-to-a-random-secret' || secret === 'local-dev-secret-change-in-production') {
      throw new Error('Secret must be changed from the default value in production');
    }
    return secret;
  }

  sign(path: string, ttlSeconds: number = 3600): string {
    const secret = this.getSecret();
    const expires = Math.floor(Date.now() / 1000) + ttlSeconds;
    const signature = crypto.createHmac('sha256', secret).update(`${path}:${expires}`).digest('hex');
    return `${path}?expires=${expires}&sig=${signature}`;
  }

  verify(path: string, query: { expires?: string; sig?: string }): boolean {
    if (!query.expires || !query.sig) return false;
    const expires = parseInt(query.expires, 10);
    if (!Number.isFinite(expires)) return false;
    if (Date.now() / 1000 > expires) return false;
    try {
      const secret = this.getSecret();
      const expected = crypto.createHmac('sha256', secret).update(`${path}:${expires}`).digest('hex');
      const actualBuffer = Buffer.from(query.sig);
      const expectedBuffer = Buffer.from(expected);
      if (actualBuffer.length !== expectedBuffer.length) return false;
      return crypto.timingSafeEqual(actualBuffer, expectedBuffer);
    } catch {
      return false;
    }
  }
}
