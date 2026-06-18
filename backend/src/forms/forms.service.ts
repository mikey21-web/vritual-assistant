import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ContactsService } from '../contacts/contacts.service';
import { LeadsService } from '../leads/leads.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class FormsService {
  constructor(
    private prisma: PrismaService,
    private contactsService: ContactsService,
    private leadsService: LeadsService,
    private auditLogs: AuditLogsService,
  ) {}

  findAll() { return this.prisma.leadForm.findMany({ include: { fields: { orderBy: { displayOrder: 'asc' } } } }); }

  async findOne(id: string) {
    const f = await this.prisma.leadForm.findUnique({ where: { id }, include: { fields: { orderBy: { displayOrder: 'asc' } } } });
    if (!f) throw new NotFoundException('Form not found');
    return f;
  }

  async create(data: any, userId?: string) { const f = await this.prisma.leadForm.create({ data }); await this.auditLogs.log('form_created', 'LeadForm', f.id, userId); return f; }
  async update(id: string, data: any, userId?: string) { await this.findOne(id); const f = await this.prisma.leadForm.update({ where: { id }, data }); await this.auditLogs.log('form_updated', 'LeadForm', id, userId); return f; }
  addField(formId: string, data: any) { return this.prisma.leadFormField.create({ data: { ...data, formId } }); }
  async updateField(formId: string, fieldId: string, data: any) { return this.prisma.leadFormField.update({ where: { id: fieldId }, data }); }
  async deleteField(formId: string, fieldId: string) { return this.prisma.leadFormField.delete({ where: { id: fieldId } }); }

  async submit(formId: string, payload: any) {
    const form = await this.findOne(formId);
    const contact = await this.contactsService.findOrCreate({
      name: payload.name, email: payload.email, phone: payload.phone, whatsapp: payload.whatsapp, company: payload.company,
    });
    const lead = await this.leadsService.create({
      contactId: contact.id, source: 'FORM', message: payload.message, interest: payload.interest, metadata: payload,
    });
    await this.prisma.formSubmission.create({ data: { formId, payload, leadId: lead.id } });
    await this.auditLogs.log('form_submitted', 'LeadForm', formId);
    return { data: { lead, contact } };
  }
}
