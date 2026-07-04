import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Generates TwiML (Twilio Markup Language) XML for voice call flows.
 * These XML responses are returned to Twilio's webhook requests to
 * control call routing, prompts, and conferencing.
 */
@Injectable()
export class TwiMLGenerator {
  private readonly logger = new Logger(TwiMLGenerator.name);
  private readonly businessName: string;
  private readonly voiceLang: string;
  private readonly voice: string;

  constructor(private config: ConfigService) {
    this.businessName = this.config.get<string>('BUSINESS_NAME') || 'Our Business';
    this.voiceLang = this.config.get<string>('TWILIO_VOICE_LANGUAGE') || 'en-US';
    this.voice = this.config.get<string>('TWILIO_VOICE') || 'Polly.Joanna-Neural';
  }

  /**
   * Generates TwiML that introduces the call to the lead, then gathers
   * input via DTMF keypress (digits) to route them appropriately.
   *
   * Flow:
   *   1. Say a personalised greeting
   *   2. Prompt with options (Press 1 for sales, Press 2 for more info)
   *   3. Gather digit input and redirect to the right handler
   */
  generateIntroductionTwiML(
    leadName: string,
    businessName?: string,
  ): string {
    const biz = businessName || this.businessName;
    const name = leadName || 'there';

    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather numDigits="1" action="{{gatherUrl}}" method="POST" timeout="5">
    <Say voice="${this.voice}" language="${this.voiceLang}">
      Hello ${this.escapeXml(name)}. This is an automated call from ${this.escapeXml(biz)}.
      We received your enquiry and would love to connect with you.
    </Say>
    <Pause length="1"/>
    <Say voice="${this.voice}" language="${this.voiceLang}">
      Press 1 to speak with our sales team right now.
      Press 2 to hear more about our services.
    </Say>
  </Gather>
  <Say voice="${this.voice}" language="${this.voiceLang}">
    We did not receive any input. We will try to call you again later. Goodbye.
  </Say>
</Response>`.trim();
  }

  /**
   * Generates TwiML that dials an agent's phone number to connect the
   * lead directly to a human.
   */
  generateConferenceTwiML(agentPhoneNumber: string): string {
    if (!agentPhoneNumber) {
      return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="${this.voice}" language="${this.voiceLang}">
    We are sorry, but no agent is available at this time. Please try again later. Goodbye.
  </Say>
</Response>`.trim();
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="${this.voice}" language="${this.voiceLang}">
    Please hold while we connect you to our team.
  </Say>
  <Dial timeout="30" record="true" callerId="{{callerId}}">
    <Number url="{{statusCallbackUrl}}">${this.escapeXml(agentPhoneNumber)}</Number>
  </Dial>
  <Say voice="${this.voice}" language="${this.voiceLang}">
    The call could not be completed at this time. Please try again later. Goodbye.
  </Say>
</Response>`.trim();
  }

  /**
   * Generates TwiML for a simple voice broadcast message.
   */
  generateBroadcastTwiML(message: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="${this.voice}" language="${this.voiceLang}">
    ${this.escapeXml(message)}
  </Say>
</Response>`.trim();
  }

  /**
   * Generates TwiML for a "ring & shout" — dial multiple numbers
   * simultaneously in a simring and connect the first to answer.
   */
  generateSimRingTwiML(phoneNumbers: string[]): string {
    if (!phoneNumbers || phoneNumbers.length === 0) {
      return this.generateBroadcastTwiML('No agents are available at this time. Goodbye.');
    }

    const dials = phoneNumbers
      .map((num) => `    <Number>${this.escapeXml(num)}</Number>`)
      .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial timeout="25" method="POST">
${dials}
  </Dial>
  <Say voice="${this.voice}" language="${this.voiceLang}">
    We could not reach anyone right now. Please try again later. Goodbye.
  </Say>
</Response>`.trim();
  }

  /**
   * Generates a <Hangup> TwiML response.
   */
  generateHangupTwiML(): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Hangup/>
</Response>`.trim();
  }

  // -- Helpers --

  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Replaces {{placeholders}} in the generated TwiML string with
   * dynamic runtime values.  This lets the static methods above
   * act as templates.
   */
  fillTemplate(twiml: string, vars: Record<string, string>): string {
    let result = twiml;
    for (const [key, value] of Object.entries(vars)) {
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), this.escapeXml(value));
    }
    return result;
  }
}
