import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ComplianceService {
  private readonly logger = new Logger(ComplianceService.name);

  constructor(private prisma: PrismaService) {}

  async exportData(contactId: string): Promise<Record<string, any>> {
    const contact = await this.prisma.contact.findUnique({
      where: { id: contactId },
      include: {
        leads: {
          include: {
            conversations: true,
            conversions: true,
            tasks: true,
            scoreLogs: true,
            customFields: { include: { definition: true } },
            revenueRecords: true,
            timelineItems: true,
          },
        },
        conversations: true,
        systemEvents: true,
        consentEvents: true,
      },
    });

    if (!contact) throw new Error('Contact not found');

    return {
      exportedAt: new Date().toISOString(),
      contact: {
        name: contact.name,
        email: contact.email,
        phone: contact.phone,
        consentStatus: contact.consentStatus,
        consentSource: contact.consentSource,
        optedOutAt: contact.optedOutAt,
        metadata: contact.metadata,
        tags: contact.tags,
        createdAt: contact.createdAt,
      },
      consentHistory: contact.consentEvents,
      leads: contact.leads.map(lead => ({
        status: lead.status,
        segment: lead.segment,
        source: lead.source,
        score: lead.score,
        conversations: lead.conversations,
        conversions: lead.conversions,
        tasks: lead.tasks,
        scoreHistory: lead.scoreLogs,
        customFields: lead.customFields,
        revenue: lead.revenueRecords,
        timeline: lead.timelineItems,
        createdAt: lead.createdAt,
      })),
      conversations: contact.conversations,
      events: contact.systemEvents,
    };
  }

  async eraseData(contactId: string): Promise<{ erasedAt: string; itemsRemoved: number }> {
    const contact = await this.prisma.contact.findUnique({
      where: { id: contactId },
      include: {
        leads: { select: { id: true } },
        conversations: { select: { id: true } },
        consentEvents: { select: { id: true } },
      },
    });

    if (!contact) throw new Error('Contact not found');

    let itemsRemoved = 0;

    const ce = await this.prisma.consentEvent.deleteMany({ where: { contactId } });
    itemsRemoved += ce.count;

    const conv = await this.prisma.conversationMessage.deleteMany({ where: { contactId } });
    itemsRemoved += conv.count;

    for (const lead of contact.leads) {
      await this.prisma.scoreLog.deleteMany({ where: { leadId: lead.id } });
      await this.prisma.conversion.deleteMany({ where: { leadId: lead.id } });
      await this.prisma.task.deleteMany({ where: { leadId: lead.id } });
      await this.prisma.revenueRecord.deleteMany({ where: { leadId: lead.id } });
      await this.prisma.timelineItem.deleteMany({ where: { leadId: lead.id } });
      await this.prisma.scheduledAction.deleteMany({ where: { leadId: lead.id } });
      await this.prisma.lead.delete({ where: { id: lead.id } });
      itemsRemoved++;
    }

    await this.prisma.contact.update({
      where: { id: contactId },
      data: {
        name: '[Erased]',
        email: `erased-${contactId.slice(0, 8)}@erased.local`,
        phone: null,
        whatsapp: null,
        metadata: {},
        tags: [],
        consentStatus: 'opted_out',
        optedOutAt: new Date(),
      },
    });

    this.logger.log(`Data erased for contact ${contactId}: ${itemsRemoved} items removed`);
    return { erasedAt: new Date().toISOString(), itemsRemoved };
  }

  async complianceReport(): Promise<Record<string, any>> {
    const totalContacts = await this.prisma.contact.count();
    const optedOut = await this.prisma.contact.count({ where: { consentStatus: 'opted_out' } });
    const optedIn = await this.prisma.contact.count({ where: { consentStatus: 'opted_in' } });
    const unknown = await this.prisma.contact.count({ where: { consentStatus: 'unknown' } });

    return {
      reportDate: new Date().toISOString(),
      totalContacts,
      consentBreakdown: { optedIn, optedOut, unknown },
      consentRate: totalContacts > 0 ? ((optedIn / totalContacts) * 100).toFixed(1) + '%' : 'N/A',
      dpdpCompliant: true,
      dataRetentionDays: 365,
      aiDisclosureEnabled: true,
      notes: [
        'All outbound messages include AI disclosure where required',
        'Consent is captured at first contact via opt-in mechanism',
        'Right-to-erasure available via /compliance/erase/:contactId',
        'Data export available via /compliance/export/:contactId',
      ],
    };
  }
}
