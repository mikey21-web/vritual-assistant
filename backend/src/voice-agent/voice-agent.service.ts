import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { BolnaService } from '../shared/bolna.service';

@Injectable()
export class VoiceAgentService {
  private readonly logger = new Logger(VoiceAgentService.name);

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
    private bolna: BolnaService,
  ) {}

  async callLead(leadId: string, userId: string, language = 'en'): Promise<{ success: boolean; callSid?: string; message?: string }> {
    const lead = await this.prisma.lead.findUnique({ where: { id: leadId }, include: { contact: true } });
    if (!lead?.contact?.phone) return { success: false, message: 'Lead has no phone number' };

    try {
      const agent = await this.bolna.createAgent(
        `mikey-call-${lead.id.slice(0, 8)}`,
        lead.contact.phone,
        lead.contact.name || 'there',
        lead.interest || 'properties',
        language,
      );
      const call = await this.bolna.initiateCall(agent.agent_id);
      const callSid = call.call_sid || `bolna_${Date.now()}`;

      await this.prisma.callLog.create({
        data: { leadId, tenantId: lead.tenantId, direction: 'OUTBOUND', fromNumber: this.config.get('TWILIO_PHONE_NUMBER', ''), toNumber: lead.contact.phone, status: 'INITIATED', providerSid: callSid, agentId: userId },
      });
      this.logger.log(`Bolna call initiated to ${lead.contact.name} (${lead.contact.phone}) — agent ${agent.agent_id}`);
      return { success: true, callSid };
    } catch (e: any) {
      this.logger.error(`Bolna call failed: ${e.message}`);
      return { success: false, message: e.message };
    }
  }

  async getCallHistory(tenantId: string, limit = 20) {
    return this.prisma.callLog.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' }, take: limit, include: { lead: { include: { contact: { select: { name: true, phone: true } } } } } });
  }
}
