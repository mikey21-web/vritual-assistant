import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { catchError, firstValueFrom, of } from 'rxjs';

@Injectable()
export class AgentClientService {
  private readonly logger = new Logger(AgentClientService.name);

  constructor(private http: HttpService, private config: ConfigService) {}

  async trigger(leadId: string, triggerId: string, channel: string, messageText: string, triggerType = 'inbound_message') {
    const url = this.config.get<string>('AGENT_SERVICE_URL');
    const key = this.config.get<string>('AGENT_INBOUND_KEY');
    if (!url) { this.logger.debug('AGENT_SERVICE_URL not set, skipping agent trigger'); return; }

    try {
      await firstValueFrom(
        this.http.post(`${url}/agent/run`, {
          leadId, triggerId, channel,
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
}
