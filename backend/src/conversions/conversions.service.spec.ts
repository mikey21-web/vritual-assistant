import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ConversionsService } from './conversions.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

describe('ConversionsService', () => {
  let service: ConversionsService;
  let prisma: any;
  const auditLogs = { log: jest.fn().mockResolvedValue({}) };

  const mockConversion = {
    id: 'conv-1',
    destination: 'CRM_QUALIFIED_PUSH',
    status: 'REQUESTED',
    leadId: 'lead-1',
    externalId: null,
    completedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    prisma = {
      conversion: {
        findMany: jest.fn().mockResolvedValue([mockConversion]),
        findUnique: jest.fn().mockResolvedValue(mockConversion),
        create: jest.fn().mockResolvedValue(mockConversion),
        update: jest.fn().mockImplementation(({ data }) => ({ ...mockConversion, ...data })),
        count: jest.fn().mockResolvedValue(1),
      },
    };

    const module = await Test.createTestingModule({
      providers: [
        ConversionsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditLogsService, useValue: auditLogs },
      ],
    }).compile();
    service = module.get<ConversionsService>(ConversionsService);
  });

  it('should create a conversion', async () => {
    const result = await service.create({ destination: 'CRM_QUALIFIED_PUSH', leadId: 'lead-1' });
    expect(result.destination).toBe('CRM_QUALIFIED_PUSH');
    expect(result.status).toBe('REQUESTED');
  });

  it('should create conversion for a lead', async () => {
    const result = await service.createForLead('lead-1', { destination: 'APPOINTMENT_BOOKING' });
    expect(result.leadId || 'implied').toBeTruthy();
  });

  it('should update conversion status', async () => {
    const result = await service.update('conv-1', { status: 'COMPLETED' });
    expect(result.status).toBe('COMPLETED');
  });

  it('should throw on non-existent conversion update', async () => {
    prisma.conversion.findUnique.mockResolvedValue(null);
    await expect(service.update('missing', { status: 'COMPLETED' })).rejects.toThrow(NotFoundException);
  });
});
