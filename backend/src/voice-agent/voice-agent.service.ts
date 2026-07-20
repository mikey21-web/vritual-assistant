import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { MoonshineService } from '../shared/moonshine.service';
import { TwilioVoiceAdapter, VoiceCallConfig } from '../shared/adapters/voice.adapter';

@Injectable()
export class VoiceAgentService {
  private readonly logger = new Logger(VoiceAgentService.name);

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
    private moonshine: MoonshineService,
    private twilio: TwilioVoiceAdapter,
  ) {}

  async callLead(leadId: string, userId: string): Promise<{ success: boolean; callSid?: string; message?: string }> {
    const lead = await this.prisma.lead.findUnique({ where: { id: leadId }, include: { contact: true } });
    if (!lead?.contact?.phone) return { success: false, message: 'Lead has no phone number' };

    const greeting = `Hi ${lead.contact.name || 'there'}, this is Mikey from your real estate team. I see you're interested in ${lead.interest || 'our properties'}. I'd love to help find the perfect home for you. Can you tell me a bit about what you're looking for?`;

    const ttsUrl = `${this.config.get('BACKEND_URL', 'http://backend:3001')}/voice-agent/tts`;
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Play>${ttsUrl}?text=${encodeURIComponent(greeting)}</Play>
  <Redirect method="POST">${this.config.get('BACKEND_URL', 'http://backend:3001')}/voice-agent/twilio-stream/${leadId}</Redirect>
</Response>`;

    const callConfig: VoiceCallConfig = { twiml, record: true, statusCallback: `${this.config.get('BACKEND_URL', 'http://backend:3001')}/voice-agent/status` };
    const result = await this.twilio.makeCall(lead.contact.phone, callConfig);

    if (result.success) {
      await this.prisma.callLog.create({ data: { leadId, tenantId: lead.tenantId, direction: 'OUTBOUND', fromNumber: this.config.get('TWILIO_PHONE_NUMBER', ''), toNumber: lead.contact.phone, status: 'initiated', providerCallId: result.callSid, initiatedById: userId } });
      this.logger.log(`Voice agent call initiated to ${lead.contact.name} (${lead.contact.phone})`);
    }
    return result;
  }

  async getCallHistory(tenantId: string, limit = 20) {
    return this.prisma.callLog.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' }, take: limit, include: { lead: { include: { contact: { select: { name: true, phone: true } } } } } });
  }
}
