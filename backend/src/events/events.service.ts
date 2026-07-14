import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';
import { RealtimeGateway } from '../realtime/realtime.gateway';

export interface EventData {
  type: string;
  source?: string;
  entityType?: string;
  entityId?: string;
  leadId?: string;
  contactId?: string;
  campaignId?: string;
  payload?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  correlationId?: string;
  idempotencyKey?: string;
  createdById?: string;
}

@Injectable()
export class EventsService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => RealtimeGateway))
    private realtime: RealtimeGateway,
  ) {}

  async emit(data: EventData) {
    const idempotencyKey = data.idempotencyKey || crypto.randomUUID();

    const existing = data.idempotencyKey
      ? await this.prisma.systemEvent.findUnique({ where: { idempotencyKey } })
      : null;

    if (existing) return existing;

    const event = await this.prisma.systemEvent.create({
      data: {
        type: data.type,
        source: data.source || 'system',
        entityType: data.entityType,
        entityId: data.entityId,
        leadId: data.leadId,
        contactId: data.contactId,
        campaignId: data.campaignId,
        payload: (data.payload || {}) as any,
        metadata: data.metadata as any,
        correlationId: data.correlationId,
        idempotencyKey,
        createdById: data.createdById,
        status: 'processed',
        processedAt: new Date(),
      },
    });

    const eventPayload = {
      id: event.id,
      type: data.type,
      source: data.source,
      entityType: data.entityType,
      entityId: data.entityId,
      leadId: data.leadId,
      payload: data.payload,
      createdAt: event.createdAt,
    };

    // Scoped emission: tenant if available, else global
    if (data.metadata?.tenantId) {
      this.realtime.emitToTenant(data.metadata.tenantId as string, `event:${data.type}`, eventPayload);
    } else {
      this.realtime.emit(`event:${data.type}`, eventPayload);
    }

    return event;
  }

  async findByLead(leadId: string) {
    return this.prisma.systemEvent.findMany({
      where: { leadId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async findByEntity(entityType: string, entityId: string) {
    return this.prisma.systemEvent.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async findByType(type: string, limit: number = 50) {
    return this.prisma.systemEvent.findMany({
      where: { type },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async findByTypePrefix(prefix: string, limit: number = 50) {
    return this.prisma.systemEvent.findMany({
      where: { type: { startsWith: prefix } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
