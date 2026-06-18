import { Test, TestingModule } from '@nestjs/testing';
import { MessageTemplatesService } from './message-templates.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

describe('MessageTemplatesService', () => {
  let service: MessageTemplatesService;
  let prisma: any;
  const auditLogs = { log: jest.fn().mockResolvedValue({}) };

  const mockTemplate = {
    id: 'tpl-1',
    name: 'Welcome',
    type: 'WELCOME',
    channel: 'WHATSAPP',
    body: 'Hello {{contact.name}}, welcome to {{business.name}}',
    variables: ['contact.name', 'business.name'],
    version: 1,
    mediaFiles: [],
  };

  beforeEach(async () => {
    prisma = {
      messageTemplate: {
        findMany: jest.fn().mockResolvedValue([mockTemplate]),
        findUnique: jest.fn().mockResolvedValue(mockTemplate),
        create: jest.fn().mockResolvedValue(mockTemplate),
        update: jest.fn().mockResolvedValue({ ...mockTemplate, version: 2 }),
      },
    };
    const module = await Test.createTestingModule({
      providers: [
        MessageTemplatesService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditLogsService, useValue: auditLogs },
      ],
    }).compile();
    service = module.get<MessageTemplatesService>(MessageTemplatesService);
  });

  it('should render template with variables', async () => {
    const result = await service.preview('tpl-1', { 'contact.name': 'John', 'business.name': 'Acme' });
    expect(result.data.rendered).toBe('Hello John, welcome to Acme');
  });

  it('should increment version on update', async () => {
    prisma.messageTemplate.findUnique.mockResolvedValue({ version: 1 });
    const result = await service.update('tpl-1', { body: 'Updated' });
    expect(result.version).toBe(2);
  });
});
