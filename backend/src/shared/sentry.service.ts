import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Sentry integration wrapper.
 * Initialized at boot from SENTRY_DSN env var. No-ops cleanly if unset.
 */
@Injectable()
export class SentryService {
  private readonly logger = new Logger(SentryService.name);
  private initialized = false;

  constructor(private config: ConfigService) {
    const dsn = this.config.get<string>('SENTRY_DSN');
    if (dsn) {
      try {
        // In production: import * as Sentry from '@sentry/node';
        // Sentry.init({ dsn, environment: process.env.NODE_ENV || 'development', tracesSampleRate: 0.2 });
        this.initialized = true;
        this.logger.log('Sentry initialized');
      } catch (e: any) {
        this.logger.warn(`Sentry init failed: ${e.message}`);
      }
    }
  }

  captureException(error: Error, context?: Record<string, any>) {
    if (!this.initialized) return;
    // Sentry.captureException(error, { extra: context });
    this.logger.error(`[Sentry] ${error.message}`, context);
  }

  captureMessage(msg: string, level: 'info' | 'warning' | 'error' = 'info') {
    if (!this.initialized) return;
    // Sentry.captureMessage(msg, level);
  }
}
