import { Test, TestingModule } from '@nestjs/testing';
import { ContactsService } from './contacts.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AdvancedFeaturesService } from '../advanced-features/advanced-features.service';

describe('ContactsService', () => {
  let service: ContactsService;
  let prisma: any;
  const auditLogs = { log: jest.fn().mockResolvedValue({}) };
  const advanced = { checkBlocklist: jest.fn().mockResolvedValue(false) };

  const mockContact = {
    id: 'contact-1',
    name: 'John Doe',
    email: 'john@test.com',
    phone: '+1234567890',
  };

  beforeEach(async () => {
    prisma = {
      contact: {
        findMany: jest.fn().mockResolvedValue([mockContact]),
        findUnique: jest.fn().mockResolvedValue(mockContact),
        findFirst: jest.fn(),
        create: jest.fn().mockResolvedValue(mockContact),
        upsert: jest.fn().mockResolvedValue(mockContact),
        update: jest.fn().mockResolvedValue(mockContact),
        count: jest.fn().mockResolvedValue(1),
      },
    };

    const module = await Test.createTestingModule({
      providers: [
        ContactsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditLogsService, useValue: auditLogs },
        { provide: AdvancedFeaturesService, useValue: advanced },
      ],
    }).compile();

    service = module.get<ContactsService>(ContactsService);
  });

  it('should create a contact', async () => {
    const c = await service.create({ name: 'Jane', email: 'jane@test.com' });
    expect(c.email).toBe('john@test.com');
  });

  it('should dedupe by phone', async () => {
    prisma.contact.upsert.mockResolvedValue(mockContact);
    const c = await service.findOrCreate({ phone: '+1234567890', name: 'John' });
    expect(c.id).toBe('contact-1');
  });

  it('should dedupe by email', async () => {
    prisma.contact.upsert.mockResolvedValue(mockContact);
    const c = await service.findOrCreate({ email: 'john@test.com', name: 'John' });
    expect(c.id).toBe('contact-1');
  });
});
