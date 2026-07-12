import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class CopilotClientService {
  private readonly logger = new Logger(CopilotClientService.name);

  constructor(private http: HttpService, private config: ConfigService) {}

  async chat(messages: { role: string; text: string }[], leadId?: string) {
    const url = this.config.get<string>('AGENT_SERVICE_URL');
    const key = this.config.get<string>('AGENT_INBOUND_KEY');
    if (!url) {
      throw new HttpException('Copilot is not configured (AGENT_SERVICE_URL missing)', HttpStatus.SERVICE_UNAVAILABLE);
    }

    try {
      const res = await firstValueFrom(
        this.http.post(`${url}/copilot/run`, { messages, leadId }, {
          headers: { 'x-agent-key': key || '', 'Content-Type': 'application/json' },
          timeout: 30000,
        }),
      );
      return res.data;
    } catch (err: any) {
      this.logger.error(`Copilot chat failed: ${err.message}`);
      throw new HttpException('Copilot request failed', HttpStatus.BAD_GATEWAY);
    }
  }
}
