import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { catchError, firstValueFrom, of } from 'rxjs';
import { FeatureFlagsService } from '../shared/feature-flags.service';

@Injectable()
export class AgentClientService {
  private readonly logger = new Logger(AgentClientService.name);

  constructor(private http: HttpService, private config: ConfigService, private featureFlags: FeatureFlagsService) {}

  async trigger(leadId: string, triggerId: string, channel: string, messageText: string, tenantId: string, triggerType = 'inbound_message') {
    const enabled = await this.featureFlags.isEnabledDefault('lead_agent_enabled', true);
    if (!enabled) {
      this.logger.warn(`lead_agent_enabled kill-switch is off, skipping agent trigger for lead ${leadId}`);
      return;
    }

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
}
