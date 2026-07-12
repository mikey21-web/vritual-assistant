import { Test, TestingModule } from '@nestjs/testing';
import { AutomationScheduleProcessor } from './automation-schedule.processor';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

describe('AutomationScheduleProcessor', () => {
  let processor: AutomationScheduleProcessor;
  let prisma: any;
  const config = { get: jest.fn((key: string, def?: any) => def) };
  let fetchMock: jest.Mock;

  beforeEach(async () => {
    prisma = {
      scheduledAction: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      lead: { findUnique: jest.fn().mockResolvedValue({ id: 'lead-1', contactId: 'contact-1' }) },
      conversationMessage: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 200 });
    global.fetch = fetchMock as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AutomationScheduleProcessor,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();

    processor = module.get<AutomationScheduleProcessor>(AutomationScheduleProcessor);
  });

  it('sends the trigger on whatever channel the lead was last messaged on', async () => {
    prisma.conversationMessage.findFirst.mockResolvedValue({ channel: 'TELEGRAM' });
    await processor.process({ data: { leadId: 'lead-1', kind: 're_engage', dedupeKey: 're_engage:lead-1:' } } as any);

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.channel).toBe('TELEGRAM');
    expect(body.trigger).toBe('re_engage');
  });

  it('falls back to WHATSAPP when the lead has no conversation history yet', async () => {
    prisma.conversationMessage.findFirst.mockResolvedValue(null);
    await processor.process({ data: { leadId: 'lead-1', kind: 're_engage', dedupeKey: 're_engage:lead-1:' } } as any);

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.channel).toBe('WHATSAPP');
  });

  it('marks the scheduled action failed when the lead no longer exists', async () => {
    prisma.lead.findUnique.mockResolvedValue(null);
    const result = await processor.process({ data: { leadId: 'gone', kind: 're_engage', dedupeKey: 're_engage:gone:' } } as any);
    expect(result).toEqual({ processed: false, reason: 'lead_not_found' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('skips work that was already claimed or cancelled', async () => {
    prisma.scheduledAction.updateMany.mockResolvedValue({ count: 0 });
    const result = await processor.process({ data: { leadId: 'lead-1', kind: 're_engage', dedupeKey: 're_engage:lead-1:' } } as any);
    expect(result).toEqual({ processed: false, reason: 'not_pending' });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
