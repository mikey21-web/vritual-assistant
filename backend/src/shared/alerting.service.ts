import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Alerting service — sends alerts to Slack webhook.
 * Falls back to logging if Slack webhook URL not configured.
 */
@Injectable()
export class AlertingService {
  private readonly logger = new Logger(AlertingService.name);
  private readonly webhookUrl: string | undefined;

  constructor(private config: ConfigService) {
    this.webhookUrl = this.config.get<string>('SLACK_WEBHOOK_URL') || this.config.get<string>('ALERT_WEBHOOK_URL');
  }

  async alert(message: string, level: 'info' | 'warning' | 'error' | 'critical' = 'error') {
    if (this.webhookUrl) {
      try {
        await fetch(this.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `[${level.toUpperCase()}] ${message}`,
            username: 'LeadAuto Alerts',
            icon_emoji: level === 'critical' ? ':rotating_light:' : ':warning:',
          }),
        });
      } catch (e: any) {
        this.logger.error(`Failed to send alert: ${e.message}`);
      }
    } else {
      this.logger.log(`[${level.toUpperCase()}] ${message}`);
    }
  }

  async healthCheckFailure(service: string, detail: string) {
    await this.alert(`Health check failed for ${service}: ${detail}`, 'error');
  }

  async circuitBreakerTripped(name: string) {
    await this.alert(`Circuit breaker tripped: ${name}`, 'warning');
  }

  async highFailureRate(queue: string, rate: number) {
    if (rate > 0.1) {
      await this.alert(`High failure rate on ${queue}: ${(rate * 100).toFixed(0)}%`, 'error');
    }
  }
}
