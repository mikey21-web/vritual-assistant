import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GdprService {
  private readonly logger = new Logger(GdprService.name);

  constructor(private prisma: PrismaService) {}

  async exportContactData(contactId: string): Promise<Record<string, any>> {
    const contact = await this.prisma.contact.findUnique({
      where: { id: contactId },
      include: {
        leads: { include: { conversations: true, conversions: true, scoreLogs: true, timelineItems: true } },
        conversations: true,
        consentEvents: true,
        customFields: { include: { definition: true } },
        timelineItems: true,
      },
    });
    if (!contact) throw new NotFoundException('Contact not found');

    return {
      exportedAt: new Date().toISOString(),
      contact: {
        name: contact.name,
        email: contact.email,
        phone: contact.phone,
        whatsapp: contact.whatsapp,
        consentStatus: contact.consentStatus,
        tags: contact.tags,
        createdAt: contact.createdAt,
      },
      leads: contact.leads.map(l => ({
        status: l.status,
        source: l.source,
        score: l.score,
        createdAt: l.createdAt,
        conversations: l.conversations.length,
        conversions: l.conversions.length,
      })),
      consentHistory: contact.consentEvents,
      customFields: contact.customFields.map(cf => ({ name: cf.definition.name, value: cf.value })),
      conversationCount: contact.conversations.length,
    };
  }

  async hardDeleteContact(contactId: string): Promise<{ message: string }> {
    const contact = await this.prisma.contact.findUnique({ where: { id: contactId } });
    if (!contact) throw new NotFoundException('Contact not found');

    // Hard delete all related data
    await this.prisma.$transaction(async (tx) => {
      const leads = await tx.lead.findMany({ where: { contactId }, select: { id: true } });
      const leadIds = leads.map(l => l.id);

      if (leadIds.length > 0) {
        await tx.conversationMessage.deleteMany({ where: { leadId: { in: leadIds } } });
        await tx.conversion.deleteMany({ where: { leadId: { in: leadIds } } });
        await tx.scoreLog.deleteMany({ where: { leadId: { in: leadIds } } });
        await tx.timelineItem.deleteMany({ where: { leadId: { in: leadIds } } });
        await tx.task.deleteMany({ where: { leadId: { in: leadIds } } });
        await tx.failureRecord.deleteMany({ where: { leadId: { in: leadIds } } });
        await tx.leadOwnershipHistory.deleteMany({ where: { leadId: { in: leadIds } } });
        await tx.internalNote.deleteMany({ where: { leadId: { in: leadIds } } });
        await tx.revenueRecord.deleteMany({ where: { leadId: { in: leadIds } } });
        await tx.scheduledAction.deleteMany({ where: { leadId: { in: leadIds } } });
        await tx.workflowInstance.deleteMany({ where: { leadId: { in: leadIds } } });
        await tx.lead.deleteMany({ where: { id: { in: leadIds } } });
      }

      await tx.conversationMessage.deleteMany({ where: { contactId } });
      await tx.consentEvent.deleteMany({ where: { contactId } });
      await tx.customFieldValue.deleteMany({ where: { contactId } });
      await tx.timelineItem.deleteMany({ where: { contactId } });
      await tx.systemEvent.deleteMany({ where: { contactId } });
      await tx.contact.delete({ where: { id: contactId } });
    });

    this.logger.log(`GDPR hard delete completed for contact ${contactId}`);
    return { message: 'Contact and all associated data permanently deleted.' };
  }

  async exportAllData(userId: string): Promise<Record<string, any>> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const leads = await this.prisma.lead.findMany({
      where: { assignedAgentId: userId },
      include: { contact: true, conversations: true, conversions: true },
    });

    return {
      exportedAt: new Date().toISOString(),
      user: { name: user.name, email: user.email, role: user.role, createdAt: user.createdAt },
      leads: leads.map(l => ({
        contact: { name: l.contact?.name, email: l.contact?.email, phone: l.contact?.phone },
        status: l.status, score: l.score, createdAt: l.createdAt,
        conversations: l.conversations.length,
      })),
    };
  }
}
