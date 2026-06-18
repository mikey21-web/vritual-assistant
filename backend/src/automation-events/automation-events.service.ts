import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class AutomationEventsService {
  constructor(
    private prisma: PrismaService,
    private auditLogs: AuditLogsService,
    @InjectQueue('automation-retry') private retryQueue: Queue,
  ) {}

  findAll(query: any = {}) {
    const { status, type, page = 1, limit = 20 } = query;
    const where: any = {};
    if (status) where.status = status;
    if (type) where.type = type;
    return Promise.all([
      this.prisma.automationEvent.findMany({ where, skip: (+page - 1) * +limit, take: +limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.automationEvent.count({ where }),
    ]).then(([data, total]) => ({ data, meta: { total, page: +page, limit: +limit } }));
  }

  async create(data: any) {
    const event = await this.prisma.automationEvent.create({ data });
    await this.auditLogs.log('automation_event_created', 'AutomationEvent', event.id, undefined, { type: data.type });
    return event;
  }

  async retry(id: string) {
    const event = await this.prisma.automationEvent.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('Event not found');
    if (event.attempts >= event.maxAttempts) throw new NotFoundException('Max retry attempts reached');

    const delay = Math.pow(2, event.attempts) * 10000;
    await this.retryQueue.add('retry', { eventId: id }, { delay, attempts: 1 });

    const updated = await this.prisma.automationEvent.update({
      where: { id },
      data: { status: 'retrying', attempts: event.attempts + 1, lastError: null },
    });
    await this.auditLogs.log('automation_event_retry', 'AutomationEvent', id, undefined, { attempt: event.attempts + 1 });
    return updated;
  }

  async getDueEvents() {
    return this.prisma.automationEvent.findMany({
      where: { status: 'failed', nextRetryAt: { lte: new Date() } },
      take: 50,
    });
  }
}
