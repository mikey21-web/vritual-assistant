import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailAdapter } from '../shared/adapters/email.adapter';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class EmailSyncService implements OnApplicationBootstrap {
  private readonly logger = new Logger(EmailSyncService.name);
  private processing = false;

  constructor(
    private prisma: PrismaService,
    private emailAdapter: EmailAdapter,
    private realtime: RealtimeGateway,
    private notifications: NotificationsService,
  ) {}

  onApplicationBootstrap() {
    setInterval(() => this.pollInbox(), 120_000);
    this.logger.log('Email sync poller started (every 2 min)');
  }

  async pollInbox() {
    if (this.processing) return;
    this.processing = true;
    try {
      const messages = await this.emailAdapter.fetchUnseen();
      for (const msg of messages) {
        await this.processInbound(msg).catch(err => this.logger.error(`Process inbound error: ${err.message}`));
      }
    } catch (err: any) {
      this.logger.error(`Poll cycle error: ${err.message}`);
    }
    this.processing = false;
  }

  private async processInbound(msg: { from: string; subject: string; body: string; messageId: string; inReplyTo?: string; uid: number }) {
    const fromEmail = msg.from.toLowerCase().trim();
    if (!fromEmail) return;

    const existing = await this.prisma.contact.findFirst({
      where: { email: fromEmail },
      include: { leads: { take: 1, orderBy: { createdAt: 'desc' } } },
    });

    let contactId: string;
    let tenantId: string;
    let leadId: string;

    if (existing) {
      contactId = existing.id;
      tenantId = existing.tenantId;
      leadId = existing.leads?.[0]?.id;
      if (!leadId) {
        const lead = await this.prisma.lead.create({
          data: { tenantId, contactId, source: 'EMAIL', status: 'NEW' },
        });
        leadId = lead.id;
      }
    } else {
      const tenant = await this.prisma.tenant.findFirst({ orderBy: { createdAt: 'asc' } });
      if (!tenant) {
        this.logger.warn('No tenant found, skipping email from ' + fromEmail);
        return;
      }
      tenantId = tenant.id;
      const newContact = await this.prisma.contact.create({
        data: { tenantId, name: fromEmail.split('@')[0], email: fromEmail },
      });
      contactId = newContact.id;
      const lead = await this.prisma.lead.create({
        data: { tenantId, contactId, source: 'EMAIL', status: 'NEW' },
      });
      leadId = lead.id;
    }

    const conversationMsg = await this.prisma.conversationMessage.create({
      data: {
        leadId,
        channel: 'EMAIL',
        direction: 'INBOUND',
        text: msg.body,
        metadata: { from: msg.from, subject: msg.subject, messageId: msg.messageId, inReplyTo: msg.inReplyTo },
        deliveryStatus: 'delivered',
      },
    });

    this.realtime.emit('conversation:new', {
      id: conversationMsg.id,
      leadId,
      channel: 'EMAIL',
      direction: 'INBOUND',
      text: msg.body,
    });

    const lead = await this.prisma.lead.findUnique({ where: { id: leadId }, select: { assignedAgentId: true } });
    if (lead?.assignedAgentId) {
      await this.notifications.create({
        tenantId,
        userId: lead.assignedAgentId,
        type: 'message_received',
        title: `New email from ${msg.from}`,
        body: msg.subject,
        link: '/leads',
      });
    }

    await this.emailAdapter.markSeen(msg.uid);
  }
}
