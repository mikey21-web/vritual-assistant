import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { DograhService } from '../shared/dograh.service';

@Injectable()
export class VoiceAgentService {
  private readonly logger = new Logger(VoiceAgentService.name);

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
    private dograh: DograhService,
  ) {}

  async callLead(leadId: string, userId: string, language = 'en'): Promise<{ success: boolean; callSid?: string; message?: string }> {
    const lead = await this.prisma.lead.findUnique({ where: { id: leadId }, include: { contact: true } });
    if (!lead?.contact?.phone) return { success: false, message: 'Lead has no phone number' };

    try {
      const workflowUuid = this.dograh.workflowUuidFor(language);
      const call = await this.dograh.triggerCall(workflowUuid, lead.contact.phone, {
        first_name: lead.contact.name || 'there',
        interest: lead.interest || 'properties',
        lead_id: lead.id,
      });
      const callSid = String(call.workflow_run_id);

      await this.prisma.callLog.create({
        data: { leadId, tenantId: lead.tenantId, direction: 'OUTBOUND', fromNumber: this.config.get('TWILIO_PHONE_NUMBER', ''), toNumber: lead.contact.phone, status: 'INITIATED', providerSid: callSid, agentId: userId },
      });
      this.logger.log(`Dograh call initiated to ${lead.contact.name} (${lead.contact.phone}) — run ${callSid}`);
      return { success: true, callSid };
    } catch (e: any) {
      this.logger.error(`Dograh call failed: ${e.message}`);
      return { success: false, message: e.message };
    }
  }

  async getCallHistory(tenantId: string, limit = 20) {
    return this.prisma.callLog.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' }, take: limit, include: { lead: { include: { contact: { select: { name: true, phone: true } } } } } });
  }

  async getSettings(language = 'en') {
    return this.dograh.getSettings(language);
  }

  async updateSettings(language: string, changes: { greeting?: string; persona?: string }) {
    await this.dograh.updateSettings(language, changes);
    return this.dograh.getSettings(language);
  }

  async createCampaign(tenantId: string, name: string, leadIds: string[], language = 'en'): Promise<{ campaignId: number; leadCount: number }> {
    const leads = await this.prisma.lead.findMany({
      where: { id: { in: leadIds }, tenantId },
      include: { contact: true },
    });
    const callable = leads.filter((l) => l.contact?.phone);
    if (callable.length === 0) throw new Error('None of the selected leads have a phone number');

    const rows = [['phone_number', 'first_name', 'lead_id', 'interest']];
    for (const lead of callable) {
      rows.push([
        lead.contact!.phone!,
        (lead.contact!.name || 'there').replace(/,/g, ' '),
        lead.id,
        (lead.interest || 'properties').replace(/,/g, ' '),
      ]);
    }
    const csv = rows.map((r) => r.join(',')).join('\n');

    const { campaignId } = await this.dograh.createCampaignFromCsv(name, language, csv);
    await this.dograh.startCampaign(campaignId);
    this.logger.log(`Campaign "${name}" created (id ${campaignId}) with ${callable.length} leads`);
    return { campaignId, leadCount: callable.length };
  }

  async listCampaigns() {
    return this.dograh.listCampaigns();
  }

  async getCampaignProgress(campaignId: number) {
    return this.dograh.getCampaignProgress(campaignId);
  }

  async pauseCampaign(campaignId: number) {
    return this.dograh.pauseCampaign(campaignId);
  }

  async resumeCampaign(campaignId: number) {
    return this.dograh.resumeCampaign(campaignId);
  }

  async uploadKnowledgeBaseDocument(file: { originalname: string; mimetype: string; buffer: Buffer }, language = 'en') {
    const doc = await this.dograh.uploadKnowledgeBaseDocument(file.originalname, file.mimetype, file.buffer);
    await this.dograh.setWorkflowKnowledgeBase(language, doc.document_uuid, true);
    return doc;
  }

  async listKnowledgeBaseDocuments() {
    return this.dograh.listKnowledgeBaseDocuments();
  }

  async deleteKnowledgeBaseDocument(documentUuid: string) {
    await this.dograh.deleteKnowledgeBaseDocument(documentUuid);
    return { deleted: true };
  }

  async getCustomFields(language = 'en') {
    return this.dograh.getCustomFields(language);
  }

  async addCustomField(language: string, field: { name: string; type: 'string' | 'number' | 'boolean'; prompt: string }) {
    await this.dograh.addCustomField(language, field);
    return this.dograh.getCustomFields(language);
  }

  async deleteCustomField(language: string, fieldName: string) {
    await this.dograh.deleteCustomField(language, fieldName);
    return this.dograh.getCustomFields(language);
  }
}
