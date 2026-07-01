import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';

interface IdempotencyRecord {
  statusCode: number;
  body: any;
  createdAt: number;
}

/**
 * Idempotency middleware that deduplicates write requests using Idempotency-Key header.
 * Uses in-memory cache (acceptable for single-replica; use Redis in multi-replica).
 * Keys expire after IDEMPOTENCY_TTL (default 24 hours).
 */
@Injectable()
export class IdempotencyMiddleware implements NestMiddleware {
  private readonly logger = new Logger(IdempotencyMiddleware.name);
  private readonly cache = new Map<string, IdempotencyRecord>();
  private readonly ttl = parseInt(process.env.IDEMPOTENCY_TTL || '86400000', 10);

  use(req: Request, res: Response, next: NextFunction) {
    // Only apply to write methods
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return next();
    }

    const key = req.headers['idempotency-key'] as string;
    if (!key) return next();

    // Validate key format
    if (key.length < 8 || key.length > 255) {
      res.status(400).json({ statusCode: 400, message: 'Idempotency-Key must be 8-255 characters' });
      return;
    }

    const cacheKey = `${req.method}:${req.path}:${key}`;

    // Check cache
    const existing = this.cache.get(cacheKey);
    if (existing) {
      this.logger.debug(`Idempotency hit: ${cacheKey}`);
      res.status(existing.statusCode).json(existing.body);
      return;
    }

    // Override res.json to capture the response
    const originalJson = res.json.bind(res);
    res.json = (body: any) => {
      if (res.statusCode >= 200 && res.statusCode < 500) {
        this.cache.set(cacheKey, {
          statusCode: res.statusCode,
          body,
          createdAt: Date.now(),
        });
        // Cleanup old entries periodically
        if (this.cache.size > 1000) {
          const now = Date.now();
          for (const [k, v] of this.cache.entries()) {
            if (now - v.createdAt > this.ttl) this.cache.delete(k);
          }
        }
      }
      return originalJson(body);
    };

    next();
  }
}
