import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class FailuresService {
  constructor(private prisma: PrismaService, @InjectQueue('failure-retry') private retryQueue: Queue) {}

  async record(data: {
    type: string;
    severity?: string;
    message: string;
    leadId?: string;
    contactId?: string;
    entityType?: string;
    entityId?: string;
    provider?: string;
    operation?: string;
    errorCode?: string;
    rawError?: unknown;
    retryable?: boolean;
  }) {
    return this.prisma.failureRecord.create({
      data: {
        type: data.type,
        severity: data.severity || 'medium',
        message: data.message,
        leadId: data.leadId,
        contactId: data.contactId,
        entityType: data.entityType,
        entityId: data.entityId,
        provider: data.provider,
        operation: data.operation,
        errorCode: data.errorCode,
        rawError: data.rawError as any,
        retryable: data.retryable !== false,
      },
    });
  }

  async getInbox(filters: { status?: string; type?: string; leadId?: string } = {}) {
    const where: any = {};
    if (filters.status) where.status = filters.status;
    if (filters.type) where.type = filters.type;
    if (filters.leadId) where.leadId = filters.leadId;
    return this.prisma.failureRecord.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async retry(id: string) {
    const failure = await this.prisma.failureRecord.findUnique({ where: { id } });
    if (!failure) throw new NotFoundException('Failure record not found');
    if (!failure.retryable) throw new BadRequestException('This failure is not retryable');
    if (failure.status === 'resolved') throw new BadRequestException('Already resolved');
    if (failure.attempts >= failure.maxAttempts) throw new BadRequestException('Max retry attempts reached');

    await this.retryQueue.add('retry-failure', { failureId: id }, { delay: 5000, attempts: 1 });

    return this.prisma.failureRecord.update({
      where: { id },
      data: { status: 'retrying', attempts: failure.attempts + 1, nextRetryAt: new Date(Date.now() + 30000) },
    });
  }

  async resolve(id: string, resolvedById?: string) {
    const failure = await this.prisma.failureRecord.findUnique({ where: { id } });
    if (!failure) throw new NotFoundException('Failure record not found');
    return this.prisma.failureRecord.update({
      where: { id },
      data: { status: 'resolved', resolvedAt: new Date(), resolvedById },
    });
  }
}
