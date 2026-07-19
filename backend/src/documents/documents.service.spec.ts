import { Test, TestingModule } from '@nestjs/testing';
import { DocumentsService } from './documents.service';
import { PrismaService } from '../prisma/prisma.service';
import { TimelineService } from '../timeline/timeline.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { BadRequestException, ForbiddenException } from '@nestjs/common';

describe('DocumentsService', () => {
  let service: DocumentsService;
  let prisma: any;

  const tenantId = 'tenant-1';
  const approvedTemplate = { id: 'tpl-1', tenantId, documentType: 'DEMAND_LETTER', status: 'APPROVED', bodyTemplate: 'Dear {{buyerName}}, pay {{amountDue}} by {{dueDate}} for {{milestoneLabel}}.', version: 1 };
  const lead = { id: 'lead-1', tenantId, contact: { name: 'Ravi Kumar' } };

  beforeEach(async () => {
    prisma = {
      documentTemplate: {
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'tpl-1', status: 'DRAFT', ...data })),
        findFirst: jest.fn().mockResolvedValue(approvedTemplate),
        findMany: jest.fn().mockResolvedValue([approvedTemplate]),
        update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ ...approvedTemplate, ...data })),
      },
      lead: { findFirst: jest.fn().mockResolvedValue(lead) },
      generatedDocument: {
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'doc-1', ...data })),
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
      },
      paymentSchedule: {
        findFirst: jest.fn().mockResolvedValue({ id: 'ps-1', tenantId, leadId: 'lead-1', bookingId: null, label: 'Booking amount', amount: 500000, currency: 'INR', dueDate: new Date('2026-08-01') }),
      },
      booking: { findFirst: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: TimelineService, useValue: { add: jest.fn() } },
        { provide: AuditLogsService, useValue: { log: jest.fn() } },
      ],
    }).compile();

    service = module.get(DocumentsService);
  });

  it('generates a document from an APPROVED template, filling all variables', async () => {
    const doc = await service.generate(tenantId, {
      templateId: 'tpl-1',
      leadId: 'lead-1',
      variables: { amountDue: 'Rs 5,00,000', dueDate: '1 Aug 2026', milestoneLabel: 'Booking amount' },
    });
    expect((doc.snapshot as any).body).toContain('Dear Ravi Kumar');
    expect((doc.snapshot as any).body).not.toContain('{{');
  });

  it('refuses to generate from a template that is not APPROVED', async () => {
    prisma.documentTemplate.findFirst.mockResolvedValue({ ...approvedTemplate, status: 'DRAFT' });
    await expect(service.generate(tenantId, { templateId: 'tpl-1', leadId: 'lead-1' })).rejects.toThrow(ForbiddenException);
  });

  it('refuses to generate when required variables are missing', async () => {
    await expect(service.generate(tenantId, { templateId: 'tpl-1', leadId: 'lead-1' })).rejects.toThrow(BadRequestException);
  });

  it('refuses to approve a template that is already APPROVED', async () => {
    await expect(service.approveTemplate(tenantId, 'tpl-1')).rejects.toThrow(ForbiddenException);
  });

  it('generates a demand letter by pulling schedule details into the template variables', async () => {
    const doc = await service.generateDemandLetter(tenantId, 'ps-1');
    expect((doc.snapshot as any).body).toContain('Booking amount');
    expect((doc.snapshot as any).body).not.toContain('{{');
  });

  it('refuses to generate a demand letter when no APPROVED template exists for the tenant', async () => {
    prisma.documentTemplate.findFirst.mockResolvedValue(null);
    await expect(service.generateDemandLetter(tenantId, 'ps-1')).rejects.toThrow(BadRequestException);
  });

  it('generateFromBooking auto-fills buyer/unit/project/booking-number variables', async () => {
    prisma.documentTemplate.findFirst.mockResolvedValue({ ...approvedTemplate, documentType: 'ALLOTMENT_LETTER', bodyTemplate: 'Unit {{unitNumber}} at {{projectName}}, booking {{bookingNumber}}, buyer {{buyerName}}.' });
    prisma.booking.findFirst.mockResolvedValue({
      id: 'b-1', leadId: 'lead-1', bookingNumber: 'BK-1',
      unit: { unitNumber: '101', project: { name: 'Skyline' } },
      applicants: [{ role: 'PRIMARY', name: 'Ravi Kumar' }],
    });
    const doc = await service.generateFromBooking(tenantId, { documentType: 'ALLOTMENT_LETTER', bookingId: 'b-1' });
    expect((doc.snapshot as any).body).toBe('Unit 101 at Skyline, booking BK-1, buyer Ravi Kumar.');
  });

  it('refuses generateFromBooking when no approved template exists for that documentType', async () => {
    prisma.documentTemplate.findFirst.mockResolvedValue(null);
    prisma.booking.findFirst.mockResolvedValue({ id: 'b-1', leadId: 'lead-1', unit: null, applicants: [] });
    await expect(service.generateFromBooking(tenantId, { documentType: 'NOC', bookingId: 'b-1' })).rejects.toThrow(BadRequestException);
  });
});
