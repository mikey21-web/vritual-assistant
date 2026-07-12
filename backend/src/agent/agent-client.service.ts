import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { catchError, firstValueFrom, of } from 'rxjs';

@Injectable()
export class AgentClientService {
  private readonly logger = new Logger(AgentClientService.name);

  constructor(private http: HttpService, private config: ConfigService) {}

  async trigger(leadId: string, triggerId: string, channel: string, messageText: string, tenantId: string, triggerType = 'inbound_message') {
    const url = this.config.get<string>('AGENT_SERVICE_URL');
    const key = this.config.get<string>('AGENT_INBOUND_KEY');
    if (!url) { this.logger.debug('AGENT_SERVICE_URL not set, skipping agent trigger'); return; }

    try {
      await firstValueFrom(
        this.http.post(`${url}/agent/run`, {
          leadId, triggerId, channel, tenantId,
          trigger: triggerType,
          messageText,
        }, {
          headers: { 'x-agent-key': key || '', 'Content-Type': 'application/json' },
          timeout: 5000,
        }).pipe(catchError(err => {
          this.logger.warn(`Agent trigger failed: ${err.message}`, { url, leadId, triggerId });
          return of(null);
        })),
      );
    } catch (err: any) {
      this.logger.warn(`Agent trigger failed: ${err.message}`, { url, leadId, triggerId });
    }
  }

  // Synchronous counterpart to trigger() — awaits the agent's reply text
  // instead of firing and forgetting. Used for voice, where there's a caller
  // on the line waiting and no async channel adapter to deliver a reply through.
  async runSync(leadId: string, triggerId: string, channel: string, messageText: string | null, tenantId: string, triggerType: string): Promise<{ reply: string; terminate: boolean }> {
    const url = this.config.get<string>('AGENT_SERVICE_URL');
    const key = this.config.get<string>('AGENT_INBOUND_KEY');
    if (!url) {
      this.logger.warn('AGENT_SERVICE_URL not set, cannot run synchronous agent turn');
      return { reply: "Sorry, I'm not able to help right now.", terminate: true };
    }

    try {
      const res = await firstValueFrom(
        this.http.post<{ reply: string; terminate: boolean }>(`${url}/agent/run-sync`, {
          leadId, triggerId, channel, tenantId,
          trigger: triggerType,
          messageText,
        }, {
          headers: { 'x-agent-key': key || '', 'Content-Type': 'application/json' },
          timeout: 15000,
        }),
      );
      return { reply: res.data.reply || 'Sorry, could you say that again?', terminate: !!res.data.terminate };
    } catch (err: any) {
      this.logger.warn(`Synchronous agent run failed: ${err.message}`, { url, leadId, triggerId });
      return { reply: "Sorry, I'm having trouble right now — let's continue this over text.", terminate: true };
    }
  }
}
