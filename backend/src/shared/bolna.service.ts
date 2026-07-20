import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class BolnaService {
  private readonly logger = new Logger(BolnaService.name);
  private readonly baseUrl: string;

  constructor(private config: ConfigService) {
    this.baseUrl = this.config.get<string>('BOLNA_URL', 'http://bolna:8000');
  }

  async createAgent(name: string, leadPhone: string, leadName: string, interest: string, language = 'en'): Promise<any> {
    const modelMap: Record<string, string> = { en: 'nova-2', te: 'navarasa-2', ta: 'navarasa-2', kn: 'navarasa-2', ml: 'navarasa-2', hi: 'navarasa-2', bn: 'navarasa-2', mr: 'navarasa-2', gu: 'navarasa-2' };
    const deepgramModel = modelMap[language] || 'nova-2';
    const langInstruction = language === 'en' ? '' : `\nIMPORTANT: Speak in ${language}. The lead speaks ${language}. Respond in the SAME language they speak.`;

    const payload = {
      agent_name: name,
      agent_config: {
        transcriber: { provider: 'deepgram', model: deepgramModel, language, stream: true },
        llm_agent: {
          agent_type: 'simple_llm_agent',
          agent_flow_type: 'streaming',
          llm_config: { provider: 'deepseek', model: 'deepseek-chat', temperature: 0.3 },
          prompt: `You are Mikey, a friendly real estate sales assistant calling on behalf of the builder. Your goal is to qualify the lead. Speak naturally and conversationally.${langInstruction}

Lead name: ${leadName}
Interested in: ${interest}

Ask about:
1. Which project interests them
2. Budget range
3. 2BHK or 3BHK
4. Timeline for buying
5. Any questions they have

Keep responses under 30 seconds. If they seem ready, offer to schedule a site visit. Be polite and professional.`,
        },
        synthesizer: { provider: 'elevenlabs', voice: 'George', model: 'eleven_turbo_v2_5', stream: true },
        telephony: { provider: 'twilio', to: leadPhone },
      },
    };

    const res = await fetch(`${this.baseUrl}/agents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`Bolna create agent failed: ${await res.text()}`);
    return res.json();
  }

  async initiateCall(agentId: string): Promise<any> {
    const res = await fetch(`${this.baseUrl}/agents/${agentId}/call`, { method: 'POST' });
    if (!res.ok) throw new Error(`Bolna call failed: ${await res.text()}`);
    return res.json();
  }

  async health(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/health`);
      return res.ok;
    } catch { return false; }
  }
}
