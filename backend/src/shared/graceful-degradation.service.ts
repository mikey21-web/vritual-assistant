import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { CircuitBreaker } from './circuit-breaker';

/**
 * Graceful degradation: if Redis or Postgres go down at runtime, the system
 * continues serving cached/degraded responses rather than failing entirely.
 */
@Injectable()
export class GracefulDegradationService {
  private readonly logger = new Logger(GracefulDegradationService.name);
  private redisHealthy = true;
  private dbHealthy = true;
  private lastCheck = 0;
  private readonly CHECK_INTERVAL = 30000; // 30s

  private readonly dbBreaker = new CircuitBreaker('graceful-db', 3, 15000);

  constructor(private prisma: PrismaService, private config: ConfigService) {}

  async withDbFallback<T>(fn: () => Promise<T>, fallback: () => T): Promise<T> {
    await this.checkHealth();
    if (!this.dbHealthy) {
      this.logger.warn('DB degraded — using fallback');
      return fallback();
    }
    try {
      return await this.dbBreaker.call(fn);
    } catch (err: any) {
      this.logger.error(`DB call failed: ${err.message}`);
      this.dbHealthy = false;
      return fallback();
    }
  }

  async withRedisFallback<T>(fn: () => Promise<T>, fallback: () => T | Promise<T>): Promise<T> {
    if (!this.redisHealthy) return fallback();
    try {
      return await fn();
    } catch (err: any) {
      this.logger.warn(`Redis call failed: ${err.message}`);
      this.redisHealthy = false;
      return fallback();
    }
  }

  private async checkHealth(): Promise<void> {
    if (Date.now() - this.lastCheck < this.CHECK_INTERVAL) return;
    this.lastCheck = Date.now();

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      this.dbHealthy = true;
    } catch {
      this.dbHealthy = false;
    }

    // Redis health check is opt-in via BullMQ inspection
    this.redisHealthy = true; // assume healthy unless proven otherwise
  }

  getStatus(): { db: boolean; redis: boolean } {
    return { db: this.dbHealthy, redis: this.redisHealthy };
  }
}
