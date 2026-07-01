import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Sentry from '@sentry/node';

/**
 * Sentry integration wrapper.
 * Initialized at boot from SENTRY_DSN env var. No-ops cleanly if unset.
 */
@Injectable()
export class SentryService {
  private readonly logger = new Logger(SentryService.name);
  initialized = false;

  constructor(private config: ConfigService) {
    const dsn = this.config.get<string>('SENTRY_DSN');
    if (dsn) {
      try {
        Sentry.init({
          dsn,
          environment: process.env.NODE_ENV || 'development',
          tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.2'),
        });
        this.initialized = true;
        this.logger.log('Sentry initialized');
      } catch (e: any) {
        this.logger.warn(`Sentry init failed: ${e.message}`);
      }
    }
  }

  getExpressErrorHandler() {
    return Sentry.expressErrorHandler();
  }

  captureException(error: Error, context?: Record<string, any>) {
    if (!this.initialized) return;
    Sentry.captureException(error, { extra: context });
  }

  captureMessage(msg: string, level: 'info' | 'warning' | 'error' = 'info') {
    if (!this.initialized) return;
    Sentry.captureMessage(msg, level);
  }
}
