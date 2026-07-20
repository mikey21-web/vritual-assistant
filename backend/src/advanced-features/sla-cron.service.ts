import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { SlaBreachService } from '../sla/sla-breach.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class SlaCronService {
  private readonly logger = new Logger(SlaCronService.name);

  constructor(
    private prisma: PrismaService,
    private slaBreach: SlaBreachService,
    private notifications: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async checkSla() {
    const rules = await this.prisma.slaRule.findMany({ where: { active: true } });

    for (const rule of rules) {
      let condition: Record<string, unknown> = {};
      try { condition = typeof rule.condition === 'string' ? JSON.parse(rule.condition) : (rule.condition as Record<string, unknown>); } catch {}

      const responseCutoff = new Date(Date.now() - rule.responseTimeMinutes * 60000);
      const where: any = { status: { notIn: ['CONVERTED', 'LOST', 'SPAM'] } };

      if (condition.status) where.status = condition.status;
      if (condition.segment) where.segment = condition.segment;
      if (condition.source) where.source = condition.source;

      const leads = await this.prisma.lead.findMany({
        where,
        take: 100,
        select: {
          id: true,
          tenantId: true,
          contact: { select: { name: true } },
          assignedAgentId: true,
          conversations: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            where: { direction: 'OUTBOUND' },
            select: { createdAt: true },
          },
        },
      });

      for (const lead of leads) {
        const lastOutbound = lead.conversations[0]?.createdAt;
        if (lastOutbound && new Date(lastOutbound) > responseCutoff) continue;

        const referenceTime = lastOutbound || new Date();
        const hoursWithoutResponse = Math.round((Date.now() - new Date(referenceTime).getTime()) / 3600000);

        await this.slaBreach.recordBreach({
          tenantId: lead.tenantId,
          leadId: lead.id,
          entityType: 'lead',
          entityId: lead.id,
          breachType: 'sla_response_time',
          metadata: {
            slaRuleId: rule.id,
            slaRuleName: rule.name,
            responseTimeMinutes: rule.responseTimeMinutes,
            hoursWithoutResponse,
          },
        });

        const escalationNeeded = rule.escalationAfterMinutes
          ? hoursWithoutResponse * 60 >= rule.escalationAfterMinutes
          : false;

        if (escalationNeeded && rule.escalationUserId) {
          try {
            await this.notifications.create({
              tenantId: lead.tenantId,
              userId: rule.escalationUserId,
              type: 'sla_breach',
              title: `SLA Breach: ${rule.name}`,
              body: `Lead ${lead.contact?.name || lead.id} has exceeded response SLA by ${hoursWithoutResponse}h`,
              link: `/leads/${lead.id}`,
            });
          } catch (e: any) {
            this.logger.warn(`Failed to create escalation notification for lead ${lead.id}: ${e.message}`);
          }
        }
      }
    }
  }
}
