import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** ponytail: hardcoded until more than a couple of languages are live, then move to DB-driven config. */
const WORKFLOW_UUID_BY_LANGUAGE: Record<string, string> = {
  en: process.env.DOGRAH_WORKFLOW_UUID_EN || '',
  te: process.env.DOGRAH_WORKFLOW_UUID_TE || '',
};
const WORKFLOW_ID_BY_LANGUAGE: Record<string, string> = {
  en: process.env.DOGRAH_WORKFLOW_ID_EN || '',
  te: process.env.DOGRAH_WORKFLOW_ID_TE || '',
};
const DEFAULT_TELEPHONY_CONFIG_ID = process.env.DOGRAH_TELEPHONY_CONFIG_ID || '1';

export interface VoiceAgentSettings {
  greeting: string;
  persona: string;
  voicemailDetectionEnabled: boolean;
}

@Injectable()
export class DograhService {
  private readonly logger = new Logger(DograhService.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(private config: ConfigService) {
    this.baseUrl = this.config.get<string>('DOGRAH_URL', 'http://host.docker.internal:8010');
    this.apiKey = this.config.get<string>('DOGRAH_API_KEY', '');
  }

  workflowUuidFor(language: string): string {
    return WORKFLOW_UUID_BY_LANGUAGE[language] || WORKFLOW_UUID_BY_LANGUAGE.en;
  }

  async triggerCall(workflowUuid: string, phoneNumber: string, initialContext: Record<string, any>): Promise<{ workflow_run_id: number; status: string }> {
    const res = await fetch(`${this.baseUrl}/api/v1/public/agent/workflow/${workflowUuid}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': this.apiKey },
      body: JSON.stringify({ phone_number: phoneNumber, initial_context: initialContext }),
    });
    if (!res.ok) throw new Error(`Dograh trigger call failed: ${await res.text()}`);
    return res.json();
  }

  async health(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/health`);
      return res.ok;
    } catch {
      return false;
    }
  }

  private async fetchWorkflowDefinition(workflowId: string): Promise<{ name: string; definition: any }> {
    const res = await fetch(`${this.baseUrl}/api/v1/workflow/fetch/${workflowId}`, {
      headers: { 'X-API-Key': this.apiKey },
    });
    if (!res.ok) throw new Error(`Dograh fetch workflow failed: ${await res.text()}`);
    const wf = await res.json();
    return { name: wf.name, definition: wf.workflow_definition };
  }

  private async saveAndPublishWorkflow(workflowId: string, name: string, definition: any): Promise<void> {
    const putRes = await fetch(`${this.baseUrl}/api/v1/workflow/${workflowId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': this.apiKey },
      body: JSON.stringify({ name, workflow_definition: definition }),
    });
    if (!putRes.ok) throw new Error(`Dograh update workflow failed: ${await putRes.text()}`);

    const publishRes = await fetch(`${this.baseUrl}/api/v1/workflow/${workflowId}/publish`, {
      method: 'POST',
      headers: { 'X-API-Key': this.apiKey },
    });
    if (!publishRes.ok) throw new Error(`Dograh publish workflow failed: ${await publishRes.text()}`);
  }

  private async getAmdEnabled(): Promise<boolean> {
    const res = await fetch(`${this.baseUrl}/api/v1/organizations/telephony-configs/${DEFAULT_TELEPHONY_CONFIG_ID}`, {
      headers: { 'X-API-Key': this.apiKey },
    });
    if (!res.ok) return false;
    const config = await res.json();
    return Boolean(config?.credentials?.amd_enabled);
  }

  async getSettings(language = 'en'): Promise<VoiceAgentSettings> {
    const workflowId = WORKFLOW_ID_BY_LANGUAGE[language] || WORKFLOW_ID_BY_LANGUAGE.en;
    const { definition } = await this.fetchWorkflowDefinition(workflowId);
    const globalNode = definition.nodes.find((n: any) => n.type === 'globalNode');
    const startNode = definition.nodes.find((n: any) => n.type === 'startCall');
    const voicemailDetectionEnabled = await this.getAmdEnabled();
    return {
      greeting: startNode?.data?.greeting || '',
      persona: globalNode?.data?.prompt || '',
      voicemailDetectionEnabled,
    };
  }

  async updateSettings(language: string, changes: { greeting?: string; persona?: string }): Promise<void> {
    const workflowId = WORKFLOW_ID_BY_LANGUAGE[language] || WORKFLOW_ID_BY_LANGUAGE.en;
    const { name, definition } = await this.fetchWorkflowDefinition(workflowId);
    const globalNode = definition.nodes.find((n: any) => n.type === 'globalNode');
    const startNode = definition.nodes.find((n: any) => n.type === 'startCall');
    if (changes.greeting !== undefined && startNode) startNode.data.greeting = changes.greeting;
    if (changes.persona !== undefined && globalNode) globalNode.data.prompt = changes.persona;
    await this.saveAndPublishWorkflow(workflowId, name, definition);
  }

  /** Fields captured by the core qualification flow itself - never shown as removable "custom" fields. */
  private static readonly BUILTIN_FIELDS = ['needs_loan', 'wants_site_visit'];

  async getCustomFields(language = 'en'): Promise<Array<{ name: string; type: string; prompt: string }>> {
    const workflowId = WORKFLOW_ID_BY_LANGUAGE[language] || WORKFLOW_ID_BY_LANGUAGE.en;
    const { definition } = await this.fetchWorkflowDefinition(workflowId);
    const loanNode = definition.nodes.find((n: any) => n.data?.name === 'loan');
    const vars: Array<{ name: string; type: string; prompt: string }> = loanNode?.data?.extraction_variables || [];
    return vars.filter((v) => !DograhService.BUILTIN_FIELDS.includes(v.name));
  }

  async addCustomField(language: string, field: { name: string; type: 'string' | 'number' | 'boolean'; prompt: string }): Promise<void> {
    const workflowId = WORKFLOW_ID_BY_LANGUAGE[language] || WORKFLOW_ID_BY_LANGUAGE.en;
    const { name, definition } = await this.fetchWorkflowDefinition(workflowId);
    const loanNode = definition.nodes.find((n: any) => n.data?.name === 'loan');
    if (!loanNode) throw new Error('Could not find the qualification node to attach the field to');
    loanNode.data.extraction_variables = loanNode.data.extraction_variables || [];
    loanNode.data.extraction_variables = loanNode.data.extraction_variables.filter((v: any) => v.name !== field.name);
    loanNode.data.extraction_variables.push(field);
    if (!loanNode.data.prompt.includes(`[custom: ${field.name}]`)) {
      loanNode.data.prompt += ` Also ask: ${field.prompt} [custom: ${field.name}]`;
    }
    await this.saveAndPublishWorkflow(workflowId, name, definition);
  }

  async deleteCustomField(language: string, fieldName: string): Promise<void> {
    const workflowId = WORKFLOW_ID_BY_LANGUAGE[language] || WORKFLOW_ID_BY_LANGUAGE.en;
    const { name, definition } = await this.fetchWorkflowDefinition(workflowId);
    const loanNode = definition.nodes.find((n: any) => n.data?.name === 'loan');
    if (!loanNode) return;
    loanNode.data.extraction_variables = (loanNode.data.extraction_variables || []).filter((v: any) => v.name !== fieldName);
    loanNode.data.prompt = loanNode.data.prompt.replace(new RegExp(` Also ask:[^\\[]*\\[custom: ${fieldName}\\]`), '');
    await this.saveAndPublishWorkflow(workflowId, name, definition);
  }

  async createCampaignFromCsv(name: string, language: string, csvContent: string): Promise<{ campaignId: number }> {
    const workflowId = WORKFLOW_ID_BY_LANGUAGE[language] || WORKFLOW_ID_BY_LANGUAGE.en;
    const fileName = `campaign-${Date.now()}.csv`;

    const uploadUrlRes = await fetch(`${this.baseUrl}/api/v1/s3/presigned-upload-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': this.apiKey },
      body: JSON.stringify({ file_name: fileName, file_size: Buffer.byteLength(csvContent), content_type: 'text/csv' }),
    });
    if (!uploadUrlRes.ok) throw new Error(`Dograh presigned upload URL failed: ${await uploadUrlRes.text()}`);
    const { upload_url: uploadUrl, file_key: fileKey, s3_key: s3Key } = await uploadUrlRes.json();
    const sourceId = fileKey || s3Key;

    const putRes = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': 'text/csv' }, body: csvContent });
    if (!putRes.ok) throw new Error(`CSV upload to Dograh storage failed: ${putRes.status}`);

    const createRes = await fetch(`${this.baseUrl}/api/v1/campaign/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': this.apiKey },
      body: JSON.stringify({
        name,
        workflow_id: parseInt(workflowId, 10),
        source_type: 'csv',
        source_id: sourceId,
        telephony_configuration_id: parseInt(DEFAULT_TELEPHONY_CONFIG_ID, 10),
      }),
    });
    if (!createRes.ok) throw new Error(`Dograh campaign create failed: ${await createRes.text()}`);
    const campaign = await createRes.json();
    return { campaignId: campaign.id };
  }

  async startCampaign(campaignId: number): Promise<any> {
    const res = await fetch(`${this.baseUrl}/api/v1/campaign/${campaignId}/start`, {
      method: 'POST',
      headers: { 'X-API-Key': this.apiKey },
    });
    if (!res.ok) throw new Error(`Dograh campaign start failed: ${await res.text()}`);
    return res.json();
  }

  async pauseCampaign(campaignId: number): Promise<any> {
    const res = await fetch(`${this.baseUrl}/api/v1/campaign/${campaignId}/pause`, {
      method: 'POST',
      headers: { 'X-API-Key': this.apiKey },
    });
    if (!res.ok) throw new Error(`Dograh campaign pause failed: ${await res.text()}`);
    return res.json();
  }

  async resumeCampaign(campaignId: number): Promise<any> {
    const res = await fetch(`${this.baseUrl}/api/v1/campaign/${campaignId}/resume`, {
      method: 'POST',
      headers: { 'X-API-Key': this.apiKey },
    });
    if (!res.ok) throw new Error(`Dograh campaign resume failed: ${await res.text()}`);
    return res.json();
  }

  async listCampaigns(): Promise<any> {
    const res = await fetch(`${this.baseUrl}/api/v1/campaign/`, { headers: { 'X-API-Key': this.apiKey } });
    if (!res.ok) throw new Error(`Dograh campaign list failed: ${await res.text()}`);
    return res.json();
  }

  async getCampaignProgress(campaignId: number): Promise<any> {
    const res = await fetch(`${this.baseUrl}/api/v1/campaign/${campaignId}/progress`, { headers: { 'X-API-Key': this.apiKey } });
    if (!res.ok) throw new Error(`Dograh campaign progress failed: ${await res.text()}`);
    return res.json();
  }

  async uploadKnowledgeBaseDocument(filename: string, mimeType: string, buffer: Buffer): Promise<any> {
    const uploadUrlRes = await fetch(`${this.baseUrl}/api/v1/knowledge-base/upload-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': this.apiKey },
      body: JSON.stringify({ filename, mime_type: mimeType }),
    });
    if (!uploadUrlRes.ok) throw new Error(`Dograh KB upload URL failed: ${await uploadUrlRes.text()}`);
    const { upload_url: uploadUrl, document_uuid: documentUuid, s3_key: s3Key } = await uploadUrlRes.json();

    const putRes = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': mimeType }, body: new Uint8Array(buffer) });
    if (!putRes.ok) throw new Error(`KB document upload to storage failed: ${putRes.status}`);

    const processRes = await fetch(`${this.baseUrl}/api/v1/knowledge-base/process-document`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': this.apiKey },
      body: JSON.stringify({ document_uuid: documentUuid, s3_key: s3Key, retrieval_mode: 'chunked' }),
    });
    if (!processRes.ok) throw new Error(`Dograh KB process-document failed: ${await processRes.text()}`);
    return processRes.json();
  }

  async listKnowledgeBaseDocuments(): Promise<any> {
    const res = await fetch(`${this.baseUrl}/api/v1/knowledge-base/documents`, { headers: { 'X-API-Key': this.apiKey } });
    if (!res.ok) throw new Error(`Dograh KB documents list failed: ${await res.text()}`);
    return res.json();
  }

  async deleteKnowledgeBaseDocument(documentUuid: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/api/v1/knowledge-base/documents/${documentUuid}`, {
      method: 'DELETE',
      headers: { 'X-API-Key': this.apiKey },
    });
    if (!res.ok) throw new Error(`Dograh KB document delete failed: ${await res.text()}`);
    // Detach from every language's workflow so stale references don't linger.
    for (const language of Object.keys(WORKFLOW_ID_BY_LANGUAGE)) {
      await this.setWorkflowKnowledgeBase(language, documentUuid, false).catch(() => {});
    }
  }

  /** Attaches (or detaches) a knowledge-base document to every conversational node so RAG search works regardless of which step the caller is on. */
  async setWorkflowKnowledgeBase(language: string, documentUuid: string, attach: boolean): Promise<void> {
    const workflowId = WORKFLOW_ID_BY_LANGUAGE[language] || WORKFLOW_ID_BY_LANGUAGE.en;
    if (!workflowId) return;
    const { name, definition } = await this.fetchWorkflowDefinition(workflowId);
    for (const node of definition.nodes) {
      if (node.type !== 'agentNode' && node.type !== 'startCall') continue;
      const current: string[] = node.data.document_uuids || [];
      node.data.document_uuids = attach
        ? Array.from(new Set([...current, documentUuid]))
        : current.filter((id) => id !== documentUuid);
    }
    await this.saveAndPublishWorkflow(workflowId, name, definition);
  }
}
