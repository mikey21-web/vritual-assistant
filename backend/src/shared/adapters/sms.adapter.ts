import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const HTTP_TIMEOUT_MS = parseInt(process.env.SMS_HTTP_TIMEOUT || '10000', 10);

async function fetchWithTimeout(url: string, init: any = {}): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS);
  try { return await fetch(url, { ...init, signal: controller.signal }); }
  finally { clearTimeout(timeout); }
}

export interface SmsAdapter {
  send(to: string, text: string, opts?: { templateId?: string }): Promise<{ success: boolean; providerMessageId?: string; error?: string }>;
}

@Injectable()
export class TwilioSmsAdapter implements SmsAdapter {
  private readonly logger = new Logger(TwilioSmsAdapter.name);

  constructor(private config: ConfigService) {}

  async send(to: string, text: string, opts?: { templateId?: string }): Promise<{ success: boolean; providerMessageId?: string; error?: string }> {
    const accountSid = this.config.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.config.get<string>('TWILIO_AUTH_TOKEN');
    const fromNumber = this.config.get<string>('TWILIO_PHONE_NUMBER');

    if (!accountSid || !authToken) {
      this.logger.warn(`Twilio not configured — simulated SMS to ${to}`);
      return { success: true, providerMessageId: `sim_${Date.now()}` };
    }

    try {
      const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
      const res = await fetchWithTimeout(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${auth}`,
        },
        body: new URLSearchParams({ To: to, From: fromNumber || '', Body: text }),
      });
      const json = await res.json();
      if (!res.ok) return { success: false, error: json.message || `Twilio error: ${res.status}` };
      return { success: true, providerMessageId: json.sid };
    } catch (e: any) {
      this.logger.error(`SMS failed to ${to}: ${e.message}`);
      return { success: false, error: e.message };
    }
  }
}
