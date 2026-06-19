import { Logger } from '@nestjs/common';

type CircuitState = 'closed' | 'open' | 'half_open';

export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failureCount = 0;
  private lastFailureTime = 0;
  private readonly logger = new Logger(`CircuitBreaker`);

  constructor(
    private readonly name: string,
    private readonly threshold: number = 5,
    private readonly resetTimeoutMs: number = 30000,
  ) {}

  async call<T>(fn: () => Promise<T>, fallback?: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime >= this.resetTimeoutMs) {
        this.state = 'half_open';
        this.logger.warn(`[${this.name}] Circuit half-open — trying again`);
      } else {
        this.logger.warn(`[${this.name}] Circuit open — using fallback`);
        return fallback ? fallback() : this.reject();
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      throw err;
    }
  }

  private onSuccess() {
    this.failureCount = 0;
    if (this.state === 'half_open') {
      this.state = 'closed';
      this.logger.log(`[${this.name}] Circuit closed — recovered`);
    }
  }

  private onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    if (this.failureCount >= this.threshold) {
      this.state = 'open';
      this.logger.error(`[${this.name}] Circuit opened — ${this.failureCount} failures`);
    }
  }

  private reject(): never {
    throw new Error(`Circuit breaker [${this.name}] is open`);
  }

  getState(): CircuitState { return this.state; }
  reset() { this.state = 'closed'; this.failureCount = 0; }
}
