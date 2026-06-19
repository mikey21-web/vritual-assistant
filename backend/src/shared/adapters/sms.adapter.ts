import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface SmsAdapter {
  send(to: string, text: string, opts?: { templateId?: string }): Promise<{ success: boolean; providerMessageId?: string; error?: string }>;
}

@Injectable()
export class TwilioSmsAdapter implements SmsAdapter {
  private readonly logger = new Logger(TwilioSmsAdapter.name);
  private twilio: any;

  constructor(private config: ConfigService) {
    const accountSid = this.config.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.config.get<string>('TWILIO_AUTH_TOKEN');
    if (accountSid && authToken) {
      // In production: this.twilio = require('twilio')(accountSid, authToken);
    }
  }

  async send(to: string, text: string, opts?: { templateId?: string }): Promise<{ success: boolean; providerMessageId?: string; error?: string }> {
    try {
      if (!this.twilio) {
        this.logger.warn(`Twilio not configured — simulated SMS to ${to}`);
        return { success: true, providerMessageId: `sim_${Date.now()}` };
      }
      const msg = await this.twilio.messages.create({ body: text, from: this.config.get<string>('TWILIO_PHONE_NUMBER'), to });
      return { success: true, providerMessageId: msg.sid };
    } catch (e: any) {
      this.logger.error(`SMS failed to ${to}: ${e.message}`);
      return { success: false, error: e.message };
    }
  }
}
