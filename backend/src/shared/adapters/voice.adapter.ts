import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const HTTP_TIMEOUT_MS = parseInt(process.env.VOICE_HTTP_TIMEOUT || '15000', 10);

async function fetchWithTimeout(url: string, init: any = {}): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

export interface VoiceAdapter {
  makeCall(to: string, config: VoiceCallConfig): Promise<{ success: boolean; callSid?: string; error?: string }>;
  healthCheck(config: VoiceAdapterConfig): Promise<boolean>;
}

export interface VoiceCallConfig {
  twimlUrl?: string;          // Public URL returning TwiML instructions
  twiml?: string;             // Inline TwiML (will be URL-encoded if provided)
  agentPhoneNumber?: string;  // If set, we generate TwiML to dial this agent
  leadName?: string;          // Used to personalise the greeting
  businessName?: string;      // Override the default business name
  statusCallback?: string;    // URL to receive call status webhooks
  callerId?: string;          // The Twilio phone number to use as caller ID
  record?: boolean;           // Whether to record the call
  timeout?: number;           // Ring timeout in seconds (default: 30)
}

export interface VoiceAdapterConfig {
  accountSid?: string;
  authToken?: string;
  phoneNumber?: string;
}

@Injectable()
export class TwilioVoiceAdapter implements VoiceAdapter {
  private readonly logger = new Logger(TwilioVoiceAdapter.name);

  constructor(private config: ConfigService) {}

  /**
   * Initiate an outbound phone call via the Twilio Voice REST API.
   * Uses Basic auth (AccountSid:AuthToken) and native fetch — no SDK.
   *
   * If Twilio credentials are not configured, returns a simulated
   * successful response for development / testing.
   */
  async makeCall(
    to: string,
    callConfig: VoiceCallConfig,
  ): Promise<{ success: boolean; callSid?: string; error?: string }> {
    const accountSid = this.config.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.config.get<string>('TWILIO_AUTH_TOKEN');
    const defaultPhoneNumber = this.config.get<string>('TWILIO_PHONE_NUMBER');

    if (!accountSid || !authToken) {
      this.logger.warn(`Twilio Voice not configured — simulated call to ${to}`);
      return { success: true, callSid: `sim_${Date.now()}` };
    }

    try {
      // Build the form-encoded body for the Twilio Calls API
      const params = new URLSearchParams();
      params.append('To', to);
      params.append('From', callConfig.callerId || defaultPhoneNumber || '');

      // Priority: inline TwiML > twimlUrl > auto-generate from agentPhoneNumber
      if (callConfig.twiml) {
        // Twilio accepts inline TwiML via the `Twiml` parameter
        params.append('Twiml', callConfig.twiml);
      } else if (callConfig.twimlUrl) {
        params.append('Url', callConfig.twimlUrl);
      } else if (callConfig.agentPhoneNumber) {
        // Build a simple dial TwiML inline
        const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial timeout="${callConfig.timeout || 30}" record="${callConfig.record ? 'true' : 'false'}"
        callerId="${callConfig.callerId || defaultPhoneNumber || ''}">
    <Number>${callConfig.agentPhoneNumber}</Number>
  </Dial>
</Response>`;
        params.append('Twiml', twiml);
      } else {
        // Default: play a fallback message
        params.append('Twiml', `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna-Neural" language="en-US">Thank you for your interest. We will be in touch shortly.</Say>
</Response>`);
      }

      if (callConfig.statusCallback) {
        params.append('StatusCallback', callConfig.statusCallback);
        params.append('StatusCallbackEvent', 'initiated,ringing,answered,completed');
      }

      if (callConfig.timeout) {
        params.append('Timeout', String(callConfig.timeout));
      }

      if (callConfig.record) {
        params.append('Record', 'true');
      }

      const basicAuth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

      const res = await fetchWithTimeout(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${basicAuth}`,
          },
          body: params.toString(),
        },
      );

      const json = await res.json();

      if (!res.ok) {
        this.logger.error(`Twilio Voice API error: ${json.message || JSON.stringify(json)}`);
        return { success: false, error: json.message || `HTTP ${res.status}` };
      }

      this.logger.log(`Call initiated to ${to} — SID: ${json.sid}`);
      return { success: true, callSid: json.sid };
    } catch (e: any) {
      this.logger.error(`Twilio Voice call failed to ${to}: ${e.message}`);
      return { success: false, error: e.message };
    }
  }

  /**
   * Verify the Twilio account credentials are valid by calling the
   * Accounts API endpoint (lightweight GET request).
   */
  async healthCheck(config: VoiceAdapterConfig): Promise<boolean> {
    const accountSid = config?.accountSid || this.config.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = config?.authToken || this.config.get<string>('TWILIO_AUTH_TOKEN');

    if (!accountSid || !authToken) {
      this.logger.warn('Twilio Voice health check skipped — credentials not configured');
      return false;
    }

    try {
      const basicAuth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
      const res = await fetchWithTimeout(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`,
        {
          method: 'GET',
          headers: { Authorization: `Basic ${basicAuth}` },
        },
      );

      if (!res.ok) {
        this.logger.warn(`Twilio Voice health check failed: HTTP ${res.status}`);
        return false;
      }

      const json = await res.json();
      const healthy = json.status === 'active' || json.status === 'active-by-usage';

      this.logger.log(`Twilio Voice health check: ${healthy ? 'OK' : 'UNHEALTHY'} (status=${json.status})`);
      return healthy;
    } catch (e: any) {
      this.logger.error(`Twilio Voice health check error: ${e.message}`);
      return false;
    }
  }
}
