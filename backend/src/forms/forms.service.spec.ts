import { Test, TestingModule } from '@nestjs/testing';
import { FormsService } from './forms.service';
import { PrismaService } from '../prisma/prisma.service';
import { ContactsService } from '../contacts/contacts.service';
import { LeadsService } from '../leads/leads.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { NotFoundException } from '@nestjs/common';

describe('FormsService', () => {
  let service: FormsService;
  let prisma: any;
  let contactsService: any;
  let leadsService: any;
  let auditLogs: any;

  const mockForm = {
    id: 'form-1',
    name: 'Contact Us',
    description: 'Main contact form',
    active: true,
    tenantId: 'default-tenant',
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z'),
    fields: [
      {
        id: 'field-1',
        formId: 'form-1',
        label: 'Full Name',
        fieldType: 'text',
        required: true,
        displayOrder: 1,
        options: null,
        placeholder: 'Enter your name',
        defaultValue: null,
      },
      {
        id: 'field-2',
        formId: 'form-1',
        label: 'Email',
        fieldType: 'email',
        required: true,
        displayOrder: 2,
        options: null,
        placeholder: 'Enter your email',
        defaultValue: null,
      },
    ],
  };

  const mockContact = {
    id: 'contact-1',
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+1234567890',
    whatsapp: null,
    company: 'Acme Inc',
  };

  const mockLead = {
    id: 'lead-1',
    contactId: 'contact-1',
    source: 'FORM',
    status: 'NEW',
  };

  const mockField = {
    id: 'field-3',
    formId: 'form-1',
    label: 'Phone',
    fieldType: 'tel',
    required: false,
    displayOrder: 3,
  };

  const mockSubmission = {
    id: 'sub-1',
    formId: 'form-1',
    leadId: 'lead-1',
    payload: { name: 'John', email: 'john@example.com' },
    createdAt: new Date('2025-01-01T00:00:00Z'),
  };

  beforeEach(async () => {
    prisma = {
      leadForm: {
        findMany: jest.fn().mockResolvedValue([mockForm]),
        findUnique: jest.fn().mockResolvedValue(mockForm),
        create: jest.fn().mockResolvedValue(mockForm),
        update: jest.fn().mockResolvedValue(mockForm),
      },
      leadFormField: {
        create: jest.fn().mockResolvedValue(mockField),
        update: jest.fn().mockResolvedValue(mockField),
        delete: jest.fn().mockResolvedValue(mockField),
      },
      formSubmission: {
        create: jest.fn().mockResolvedValue(mockSubmission),
      },
    };

    contactsService = {
      findOrCreate: jest.fn().mockResolvedValue(mockContact),
    };

    leadsService = {
      create: jest.fn().mockResolvedValue(mockLead),
    };

    auditLogs = {
      log: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FormsService,
        { provide: PrismaService, useValue: prisma },
        { provide: ContactsService, useValue: contactsService },
        { provide: LeadsService, useValue: leadsService },
        { provide: AuditLogsService, useValue: auditLogs },
      ],
    }).compile();

    service = module.get<FormsService>(FormsService);
  });

  // ── findAll ─────────────────────────────────────

  it('should find all forms with fields ordered by displayOrder', async () => {
    const forms = await service.findAll();
    expect(forms).toHaveLength(1);
    expect(forms[0].fields).toHaveLength(2);
    expect(prisma.leadForm.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: { fields: { orderBy: { displayOrder: 'asc' } } },
      }),
    );
  });

  it('should return empty array when no forms exist', async () => {
    prisma.leadForm.findMany.mockResolvedValue([]);
    const result = await service.findAll();
    expect(result).toEqual([]);
  });

  // ── findOne ─────────────────────────────────────

  it('should find a form by id with fields', async () => {
    const form = await service.findOne('form-1');
    expect(form.id).toBe('form-1');
    expect(form.name).toBe('Contact Us');
    expect(form.fields[0].label).toBe('Full Name');
  });

  it('should throw NotFoundException when form not found', async () => {
    prisma.leadForm.findUnique.mockResolvedValue(null);
    await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
  });

  // ── create ──────────────────────────────────────

  it('should create a form and log audit', async () => {
    const form = await service.create({ name: 'Contact Us', active: true }, 'user-1');
    expect(form.name).toBe('Contact Us');
    expect(auditLogs.log).toHaveBeenCalledWith('form_created', 'LeadForm', form.id, 'user-1');
  });

  it('should create a form without userId', async () => {
    await service.create({ name: 'Newsletter Signup' });
    expect(auditLogs.log).toHaveBeenCalledWith('form_created', 'LeadForm', mockForm.id, undefined);
  });

  // ── update ──────────────────────────────────────

  it('should update a form and log audit', async () => {
    prisma.leadForm.update.mockResolvedValue({ ...mockForm, name: 'Updated Form' });
    const form = await service.update('form-1', { name: 'Updated Form' }, 'user-1');
    expect(form.name).toBe('Updated Form');
    expect(auditLogs.log).toHaveBeenCalledWith('form_updated', 'LeadForm', 'form-1', 'user-1');
  });

  it('should throw NotFoundException when updating non-existent form', async () => {
    prisma.leadForm.findUnique.mockResolvedValue(null);
    await expect(service.update('nonexistent', { name: 'Nope' })).rejects.toThrow(NotFoundException);
  });

  it('should call findOne before update to verify existence', async () => {
    await service.update('form-1', { name: 'Renamed' });
    expect(prisma.leadForm.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'form-1' } }),
    );
  });

  // ── addField ────────────────────────────────────

  it('should add a field to a form', async () => {
    const field = await service.addField('form-1', {
      label: 'Phone',
      fieldType: 'tel',
      displayOrder: 3,
    });
    expect(field.label).toBe('Phone');
    expect(field.formId).toBe('form-1');
    expect(prisma.leadFormField.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ label: 'Phone', formId: 'form-1' }),
      }),
    );
  });

  it('should add a field with all optional properties', async () => {
    await service.addField('form-1', {
      label: 'Company',
      fieldType: 'text',
      required: true,
      placeholder: 'Your company',
      displayOrder: 4,
      options: ['Tech', 'Finance'],
    });
    expect(prisma.leadFormField.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          label: 'Company',
          required: true,
          placeholder: 'Your company',
          formId: 'form-1',
        }),
      }),
    );
  });

  // ── updateField ─────────────────────────────────

  it('should update a field', async () => {
    prisma.leadFormField.update.mockResolvedValue({ ...mockField, label: 'Phone Number' });
    const field = await service.updateField('form-1', 'field-3', { label: 'Phone Number' });
    expect(prisma.leadFormField.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'field-3' },
        data: { label: 'Phone Number' },
      }),
    );
  });

  // ── deleteField ─────────────────────────────────

  it('should delete a field', async () => {
    await service.deleteField('form-1', 'field-3');
    expect(prisma.leadFormField.delete).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'field-3' } }),
    );
  });

  // ── submit ──────────────────────────────────────

  it('should process a form submission creating contact, lead, and submission record', async () => {
    const payload = {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+1234567890',
      message: 'Interested in your services',
    };
    const result = await service.submit('form-1', payload, {});

    expect(contactsService.findOrCreate).toHaveBeenCalledWith(
      {
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        whatsapp: undefined,
        company: undefined,
      },
      {},
    );

    expect(leadsService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        contactId: 'contact-1',
        source: 'FORM',
        message: 'Interested in your services',
        metadata: payload,
      }),
    );

    expect(prisma.formSubmission.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { formId: 'form-1', payload, leadId: 'lead-1' },
      }),
    );

    expect(auditLogs.log).toHaveBeenCalledWith('form_submitted', 'LeadForm', 'form-1');
    expect(result.data.lead.id).toBe('lead-1');
    expect(result.data.contact.id).toBe('contact-1');
  });

  it('should pass optional whatsapp and company fields to findOrCreate', async () => {
    const payload = {
      name: 'Jane',
      email: 'jane@example.com',
      phone: '+1987654321',
      whatsapp: '+1987654321',
      company: 'Corp',
    };
    await service.submit('form-1', payload, {});
    expect(contactsService.findOrCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        whatsapp: '+1987654321',
        company: 'Corp',
      }),
      {},
    );
  });

  it('should throw NotFoundException when submitting to non-existent form', async () => {
    prisma.leadForm.findUnique.mockResolvedValue(null);
    await expect(service.submit('nonexistent', { name: 'Test' })).rejects.toThrow(NotFoundException);
  });

  it('should include interest in lead creation', async () => {
    const payload = { name: 'Test', email: 'test@test.com', interest: 'Premium Plan' };
    await service.submit('form-1', payload, {});
    expect(leadsService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        interest: 'Premium Plan',
      }),
    );
  });

  it('should use formId from findOne in the submission', async () => {
    await service.submit('form-1', { name: 'Test', email: 'test@test.com' }, {});
    expect(prisma.formSubmission.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ formId: 'form-1' }),
      }),
    );
  });
});
