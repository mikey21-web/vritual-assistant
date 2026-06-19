import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

export interface PolicyResult {
  allowed: boolean;
  reason?: string;
  action?: 'block' | 'reschedule' | 'require_approval';
  rescheduleAt?: Date;
  requiresTemplate?: boolean;
}

@Injectable()
export class MessagePolicyService {
  private readonly logger = new Logger(MessagePolicyService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Evaluate whether a message can be sent to a lead.
   * Checks run in order and fail closed — first violation blocks the send.
   */
  async evaluate(
    leadId: string,
    channel: string,
    text: string,
    opts?: { isProactive?: boolean; templateId?: string },
  ): Promise<PolicyResult> {
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        contact: true,
        conversations: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { createdAt: true, direction: true },
        },
      },
    });

    if (!lead || !lead.contact) {
      return { allowed: false, reason: 'lead_not_found', action: 'block' };
    }

    const contact = lead.contact;

    // 1. Consent / opt-out check
    if (contact.optedOutAt) {
      return { allowed: false, reason: 'no_consent', action: 'block' };
    }
    if (contact.consentStatus === 'opted_out') {
      return { allowed: false, reason: 'opted_out', action: 'block' };
    }
    if (opts?.isProactive && contact.consentStatus !== 'opted_in') {
      return { allowed: false, reason: 'no_consent_proactive', action: 'block' };
    }

    // 2. Blocklist check
    if (contact.phone) {
      const cleanPhone = contact.phone.replace(/[\s\-\(\)\+]/g, '');
      const blocked = await this.prisma.blocklistEntry.findFirst({
        where: { type: 'phone', value: cleanPhone },
      });
      if (blocked) return { allowed: false, reason: 'blocklisted', action: 'block' };
    }
    if (contact.email) {
      const blocked = await this.prisma.blocklistEntry.findFirst({
        where: { type: 'email', value: contact.email.toLowerCase().trim() },
      });
      if (blocked) return { allowed: false, reason: 'blocklisted', action: 'block' };
    }

    // 3. Quiet hours
    const settings = await this.prisma.businessSettings.findFirst({});
    if (settings?.quietHoursStart && settings?.quietHoursEnd && opts?.isProactive) {
      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      if (this.isInQuietHours(timeStr, settings.quietHoursStart, settings.quietHoursEnd)) {
        const rescheduleAt = this.nextAllowedTime(settings.quietHoursEnd, settings.timezone || 'UTC');
        return {
          allowed: false,
          reason: 'quiet_hours',
          action: 'reschedule',
          rescheduleAt,
        };
      }
    }

    // 4. Rate limit for proactive sends
    if (opts?.isProactive && settings?.maxMessagesPerDay) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const sentToday = await this.prisma.conversationMessage.count({
        where: {
          leadId,
          direction: 'OUTBOUND',
          createdAt: { gte: today },
        },
      });
      if (sentToday >= settings.maxMessagesPerDay) {
        return { allowed: false, reason: 'rate_limited', action: 'reschedule' };
      }
    }

    // 5. Dedup — check for near-identical outbound message in last 24h
    if (text) {
      const textHash = crypto.createHash('sha256').update(text.toLowerCase().trim()).digest('hex');
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const similar = await this.prisma.conversationMessage.findFirst({
        where: {
          leadId,
          direction: 'OUTBOUND',
          createdAt: { gte: cutoff },
        },
        orderBy: { createdAt: 'desc' },
      });
      if (similar) {
        const similarHash = crypto.createHash('sha256').update(similar.text.toLowerCase().trim()).digest('hex');
        if (similarHash === textHash) {
          return { allowed: false, reason: 'duplicate', action: 'block' };
        }
      }
    }

    // 6. WhatsApp 24h window
    if (channel === 'WHATSAPP' && opts?.isProactive) {
      const lastInbound = lead.conversations.find(c => c.direction === 'INBOUND');
      if (!lastInbound) {
        // No prior inbound — require a template
        if (!opts?.templateId) {
          return {
            allowed: false,
            reason: 'outside_window_no_template',
            action: 'block',
            requiresTemplate: true,
          };
        }
      } else {
        const hoursSinceInbound = (Date.now() - new Date(lastInbound.createdAt).getTime()) / 3600000;
        if (hoursSinceInbound > 24 && !opts?.templateId) {
          return {
            allowed: false,
            reason: 'outside_window_no_template',
            action: 'block',
            requiresTemplate: true,
          };
        }
      }
    }

    return { allowed: true };
  }

  private isInQuietHours(time: string, start: string, end: string): boolean {
    if (start < end) {
      return time >= start && time < end;
    }
    // Overnight quiet hours (e.g. 21:00 - 09:00)
    return time >= start || time < end;
  }

  private nextAllowedTime(quietEnd: string, _timezone: string): Date {
    const [h, m] = quietEnd.split(':').map(Number);
    const now = new Date();
    const next = new Date(now);
    next.setHours(h, m, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);
    return next;
  }
}
