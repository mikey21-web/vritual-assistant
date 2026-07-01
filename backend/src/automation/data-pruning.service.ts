import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DataPruningService {
  private readonly logger = new Logger(DataPruningService.name);

  constructor(private prisma: PrismaService) {}

  async pruneAll(): Promise<{ [table: string]: number }> {
    const results: { [table: string]: number } = {};
    const now = new Date();

    // WebhookEvent: keep 90 days
    const webhookCutoff = new Date(now.getTime() - 90 * 86400000);
    results.webhookEvents = await this.prisma.webhookEvent.deleteMany({
      where: { createdAt: { lt: webhookCutoff } },
    }).then(r => r.count);

    // AutomationEvent: keep 90 days
    results.automationEvents = await this.prisma.automationEvent.deleteMany({
      where: { createdAt: { lt: webhookCutoff } },
    }).then(r => r.count);

    // OutboxMessage: keep 30 days (keep delivered + failed for limited time)
    const outboxCutoff = new Date(now.getTime() - 30 * 86400000);
    results.outboxMessages = await this.prisma.outboxMessage.deleteMany({
      where: {
        createdAt: { lt: outboxCutoff },
        status: { in: ['delivered', 'failed'] },
      },
    }).then(r => r.count);

    // FailureRecord: keep 90 days
    results.failureRecords = await this.prisma.failureRecord.deleteMany({
      where: { createdAt: { lt: webhookCutoff } },
    }).then(r => r.count);

    // AuditLog: keep 1 year
    const auditCutoff = new Date(now.getTime() - 365 * 86400000);
    results.auditLogs = await this.prisma.auditLog.deleteMany({
      where: { createdAt: { lt: auditCutoff } },
    }).then(r => r.count);

    // ScoreLog: keep 1 year
    results.scoreLogs = await this.prisma.scoreLog.deleteMany({
      where: { createdAt: { lt: auditCutoff } },
    }).then(r => r.count);

    // TimelineItem: keep 2 years
    const timelineCutoff = new Date(now.getTime() - 730 * 86400000);
    results.timelineItems = await this.prisma.timelineItem.deleteMany({
      where: { createdAt: { lt: timelineCutoff } },
    }).then(r => r.count);

    const total = Object.values(results).reduce((a, b) => a + b, 0);
    this.logger.log(`Pruned ${total} records: ${JSON.stringify(results)}`);

    return results;
  }
}
