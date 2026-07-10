import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type NotificationType =
  | 'lead_assigned'
  | 'lead_hot'
  | 'message_received'
  | 'sla_breach'
  | 'webhook_failure'
  | 'generic';

const PREF_FIELD_BY_TYPE: Partial<Record<NotificationType, string>> = {
  lead_assigned: 'leadAssigned',
  lead_hot: 'leadHot',
  message_received: 'messageReceived',
  sla_breach: 'slaBreach',
  webhook_failure: 'webhookFailure',
};

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async create(opts: {
    tenantId: string;
    userId?: string;
    type: NotificationType;
    title: string;
    body?: string;
    link?: string;
  }) {
    const prefField = PREF_FIELD_BY_TYPE[opts.type];
    if (opts.userId && prefField) {
      const prefs = await this.prisma.notificationPreference.findUnique({ where: { userId: opts.userId } });
      if (prefs && prefs[prefField as keyof typeof prefs] === false) return null;
    }

    return this.prisma.notification.create({
      data: {
        tenantId: opts.tenantId,
        userId: opts.userId,
        type: opts.type,
        title: opts.title,
        body: opts.body,
        link: opts.link,
      },
    });
  }

  async findForUser(userId: string, opts: { unreadOnly?: boolean; limit?: number } = {}) {
    return this.prisma.notification.findMany({
      where: { userId, ...(opts.unreadOnly ? { read: false } : {}) },
      orderBy: { createdAt: 'desc' },
      take: opts.limit ?? 20,
    });
  }

  async unreadCount(userId: string) {
    return this.prisma.notification.count({ where: { userId, read: false } });
  }

  async markRead(id: string, userId: string) {
    return this.prisma.notification.updateMany({ where: { id, userId }, data: { read: true } });
  }

  async markAllRead(userId: string) {
    return this.prisma.notification.updateMany({ where: { userId, read: false }, data: { read: true } });
  }
}
