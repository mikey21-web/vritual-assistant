import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailAdapter } from '../shared/adapters/email.adapter';

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical' | 'error';
export type AlertChannel = 'slack_webhook' | 'telegram' | 'email';

export interface AlertPayload {
  channel: AlertChannel;
  message: string;
  severity: AlertSeverity;
  metadata?: Record<string, unknown>;
}

export interface FailureRecord {
  id: string;
  type: string;
  severity: string;
  message: string;
  provider?: string;
  operation?: string;
  entityType?: string;
  entityId?: string;
  createdAt: Date;
}

@Injectable()
export class AlertingService {
  private readonly logger = new Logger(AlertingService.name);

  constructor(
    private config: ConfigService,
    private email: EmailAdapter,
  ) {}

  async sendAlert(channel: AlertChannel, message: string, severity: AlertSeverity = 'medium'): Promise<{ sent: boolean; channel: string; error?: string }> {
    try {
      switch (channel) {
        case 'slack_webhook':
          return await this.sendSlackAlert(message, severity);
        case 'telegram':
          return await this.sendTelegramAlert(message, severity);
        case 'email':
          return await this.sendEmailAlert(`[${severity.toUpperCase()}] System Alert`, message);
        default:
          return { sent: false, channel, error: `Unsupported alert channel: ${channel}` };
      }
    } catch (e: any) {
      this.logger.error(`Failed to send ${channel} alert: ${e.message}`);
      return { sent: false, channel, error: e.message };
    }
  }

  async sendSlackAlert(message: string, severity: AlertSeverity = 'error'): Promise<{ sent: boolean; channel: string; error?: string }> {
    const webhookUrl = this.config.get<string>('SLACK_WEBHOOK_URL') || this.config.get<string>('ALERT_WEBHOOK_URL');
    if (!webhookUrl) {
      this.logger.log(`[SLACK][${severity.toUpperCase()}] ${message}`);
      return { sent: false, channel: 'slack_webhook', error: 'SLACK_WEBHOOK_URL not configured' };
    }

    const emojiMap: Record<string, string> = {
      low: ':information_source:',
      medium: ':warning:',
      high: ':rotating_light:',
      critical: ':rotating_light:',
    };

    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `*[${severity.toUpperCase()}] LeadAuto Alert*`,
          attachments: [
            {
              color: severity === 'critical' || severity === 'high' ? '#dc3545' : severity === 'medium' ? '#ffc107' : '#17a2b8',
              text: message,
              footer: `Severity: ${severity}`,
              ts: Math.floor(Date.now() / 1000),
            },
          ],
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => 'unknown');
        return { sent: false, channel: 'slack_webhook', error: `HTTP ${res.status}: ${text}` };
      }

      return { sent: true, channel: 'slack_webhook' };
    } catch (e: any) {
      return { sent: false, channel: 'slack_webhook', error: e.message };
    }
  }

  async sendTelegramAlert(message: string, severity: AlertSeverity = 'medium'): Promise<{ sent: boolean; channel: string; error?: string }> {
    const botToken = this.config.get<string>('TELEGRAM_BOT_TOKEN');
    const chatId = this.config.get<string>('TELEGRAM_ALERT_CHAT_ID');

    if (!botToken || !chatId) {
      this.logger.log(`[TELEGRAM][${severity.toUpperCase()}] ${message}`);
      return { sent: false, channel: 'telegram', error: 'TELEGRAM_BOT_TOKEN or TELEGRAM_ALERT_CHAT_ID not configured' };
    }

    const prefixEmoji: Record<string, string> = {
      low: 'ℹ️',
      medium: '⚠️',
      high: '🚨',
      critical: '🔥',
    };

    const formatted = [
      `${prefixEmoji[severity] || 'ℹ️'} *LeadAuto Alert [${severity.toUpperCase()}]*`,
      '',
      message,
      '',
      `_${new Date().toISOString()}_`,
    ].join('\n');

    try {
      const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: formatted,
          parse_mode: 'Markdown',
        }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        return { sent: false, channel: 'telegram', error: json?.description || `HTTP ${res.status}` };
      }

      return { sent: true, channel: 'telegram' };
    } catch (e: any) {
      return { sent: false, channel: 'telegram', error: e.message };
    }
  }

  async sendEmailAlert(subject: string, body: string): Promise<{ sent: boolean; channel: string; error?: string }> {
    const alertEmail = this.config.get<string>('ALERT_EMAIL');
    if (!alertEmail) {
      this.logger.log(`[EMAIL] ${subject}: ${body}`);
      return { sent: false, channel: 'email', error: 'ALERT_EMAIL not configured' };
    }

    const html = [
      '<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>',
      '<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;">',
      `<h2 style="color:#dc3545;">${subject}</h2>`,
      `<pre style="background:#f8f9fa;padding:16px;border-radius:8px;white-space:pre-wrap;word-wrap:break-word;">${body}</pre>`,
      `<hr style="border:none;border-top:1px solid #eee;">`,
      `<p style="color:#6c757d;font-size:12px;">Sent at ${new Date().toISOString()} by LeadAuto Monitoring</p>`,
      '</div></body></html>',
    ].join('\n');

    try {
      const result = await this.email.send(alertEmail, subject, html);
      if (!result.success) {
        return { sent: false, channel: 'email', error: result.error || 'Send failed' };
      }
      return { sent: true, channel: 'email' };
    } catch (e: any) {
      return { sent: false, channel: 'email', error: e.message };
    }
  }

  async notifyOnFailure(failure: FailureRecord): Promise<void> {
    const severity = (failure.severity || 'medium').toLowerCase() as AlertSeverity;
    const message = [
      `*Failure Record:* ${failure.id}`,
      `*Type:* ${failure.type}`,
      `*Operation:* ${failure.operation || 'N/A'}`,
      `*Provider:* ${failure.provider || 'N/A'}`,
      `*Entity:* ${failure.entityType || 'N/A'} ${failure.entityId || ''}`,
      ``,
      `*Message:* ${failure.message}`,
      `*Created:* ${failure.createdAt.toISOString()}`,
    ].join('\n');

    switch (severity) {
      case 'critical':
      case 'high':
        // HIGH/CRITICAL → Slack + Telegram
        await Promise.allSettled([
          this.sendSlackAlert(message, severity),
          this.sendTelegramAlert(message, severity),
        ]);
        break;

      case 'medium':
        // MEDIUM → Slack only
        await this.sendSlackAlert(message, severity).catch(() => {});
        break;

      case 'low':
      default:
        // LOW → log only
        this.logger.log(`[FAILURE][LOW] ${failure.type}: ${failure.message}`);
        break;
    }
  }
}
