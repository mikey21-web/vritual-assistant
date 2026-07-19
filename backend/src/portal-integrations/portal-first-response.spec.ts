import { Test, TestingModule } from '@nestjs/testing';
import { PortalIntegrationsService } from './portal-integrations.service';
import { PrismaService } from '../prisma/prisma.service';
import { ContactsService } from '../contacts/contacts.service';
import { LeadsService } from '../leads/leads.service';
import { ConversationsService } from '../conversations/conversations.service';

describe('PortalIntegrationsService first-response ack', () => {
  let service: PortalIntegrationsService;
  let prisma: any;
  let leadsService: any;
  let conversationsService: any;

  const contact = { id: 'contact-1', name: 'Ravi Kumar' };
  const welcomeTemplate = { id: 'tpl-1', type: 'WELCOME', channel: 'WHATSAPP', active: true, body: 'Hi {{name}}, thanks for your interest!' };

  beforeEach(async () => {
    prisma = {
      webhookEvent: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({}) },
      lead: { findFirst: jest.fn().mockResolvedValue(null) },
      messageTemplate: { findFirst: jest.fn().mockResolvedValue(welcomeTemplate) },
    };
    leadsService = { create: jest.fn().mockResolvedValue({ id: 'lead-1', contactId: 'contact-1' }) };
    conversationsService = { create: jest.fn().mockResolvedValue({ id: 'msg-1' }) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PortalIntegrationsService,
        { provide: PrismaService, useValue: prisma },
        { provide: ContactsService, useValue: { findOrCreate: jest.fn().mockResolvedValue(contact) } },
        { provide: LeadsService, useValue: leadsService },
        { provide: ConversationsService, useValue: conversationsService },
      ],
    }).compile();

    service = module.get(PortalIntegrationsService);
  });

  it('sends a WhatsApp ack for a brand-new lead when an active WELCOME template exists', async () => {
    await service.handleIndiaMART({ lead_id: 'x1', buyer_name: 'Ravi Kumar', buyer_mobile: '9876543210' });
    await new Promise(process.nextTick); // let the fire-and-forget ack settle
    expect(conversationsService.create).toHaveBeenCalledWith(
      expect.objectContaining({ leadId: 'lead-1', channel: 'WHATSAPP', direction: 'OUTBOUND', text: 'Hi Ravi, thanks for your interest!' }),
    );
  });

  it('does not send an ack when no active WELCOME template is configured', async () => {
    prisma.messageTemplate.findFirst.mockResolvedValue(null);
    await service.handleIndiaMART({ lead_id: 'x2', buyer_name: 'Ravi Kumar', buyer_mobile: '9876543210' });
    await new Promise(process.nextTick);
    expect(conversationsService.create).not.toHaveBeenCalled();
  });

  it('does not send an ack when the lead already existed (not a new lead)', async () => {
    prisma.lead.findFirst.mockResolvedValue({ id: 'existing-lead' });
    await service.handleIndiaMART({ lead_id: 'x3', buyer_name: 'Ravi Kumar', buyer_mobile: '9876543210' });
    await new Promise(process.nextTick);
    expect(conversationsService.create).not.toHaveBeenCalled();
  });
});
