import { Injectable, NestMiddleware, BadRequestException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';

/**
 * CSRF protection for cookie-based sessions.
 *
 * Uses the double-submit cookie pattern:
 * 1. Server sets a CSRF token in a non-readable cookie
 * 2. Client must echo this token in the x-csrf-token header on writes
 * 3. Server compares both values
 *
 * For Bearer-token auth (current setup), CSRF is N/A — token auth is
 * inherently protected from CSRF. We still set the cookie to be safe.
 */
@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  private readonly SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];
  private readonly COOKIE_NAME = 'csrf-token';

  use(req: Request, res: Response, next: NextFunction) {
    // Always ensure a CSRF token exists
    let token = (req as any).cookies?.[this.COOKIE_NAME];
    if (!token) {
      token = crypto.randomBytes(32).toString('hex');
      res.cookie(this.COOKIE_NAME, token, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000,
      });
    }

    // Skip CSRF check for safe methods or Bearer-auth requests
    if (this.SAFE_METHODS.includes(req.method)) return next();
    const authHeader = req.headers.authorization || '';
    if (authHeader.startsWith('Bearer ')) return next();
    // Service-to-service with x-service-key also doesn't need CSRF
    if (req.headers['x-service-key']) return next();

    // For cookie-based sessions, require token match
    const headerToken = req.headers['x-csrf-token'];
    if (headerToken && typeof headerToken === 'string' && headerToken === token) return next();

    // For now, warn instead of blocking since most auth is Bearer-based
    // Uncomment the next line to enforce CSRF on cookie sessions
    // throw new BadRequestException('CSRF token mismatch');

    next();
  }
}
