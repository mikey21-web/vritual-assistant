import { Test, TestingModule } from '@nestjs/testing';
import { HttpException } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { CopilotClientService } from './copilot-client.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';

describe('CopilotClientService', () => {
  let service: CopilotClientService;
  const http = { post: jest.fn() };
  const config = {
    get: jest.fn((key: string) => {
      if (key === 'AGENT_SERVICE_URL') return 'http://agent-service:8000';
      if (key === 'AGENT_INBOUND_KEY') return 'test-key';
      return undefined;
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CopilotClientService,
        { provide: HttpService, useValue: http },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();
    service = module.get<CopilotClientService>(CopilotClientService);
  });

  it('forwards messages to the agent-service and returns its reply', async () => {
    http.post.mockReturnValue(of({ data: { reply: 'Here are your hot leads', actions: [] } }));
    const result = await service.chat([{ role: 'user', text: 'who is hot?' }], undefined);
    expect(result.reply).toBe('Here are your hot leads');
    expect(http.post).toHaveBeenCalledWith(
      'http://agent-service:8000/copilot/run',
      { messages: [{ role: 'user', text: 'who is hot?' }], leadId: undefined },
      expect.objectContaining({ headers: expect.objectContaining({ 'x-agent-key': 'test-key' }) }),
    );
  });

  it('raises a 502 when the agent-service call fails', async () => {
    http.post.mockReturnValue(throwError(() => new Error('connection refused')));
    await expect(service.chat([{ role: 'user', text: 'hi' }])).rejects.toThrow(HttpException);
  });

  it('raises a 503 when AGENT_SERVICE_URL is not configured', async () => {
    config.get.mockReturnValue(undefined);
    await expect(service.chat([{ role: 'user', text: 'hi' }])).rejects.toThrow('Copilot is not configured');
  });
});
