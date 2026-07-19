import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Persists SLA violations as first-class SlaBreach rows (spec 46.2/6) instead
 * of leaving them as transient in-memory scheduler findings — so "8 hot leads
 * are untouched" is a real, queryable, auditable fact with an age and a
 * resolution, not something that vanishes the moment the process restarts.
 */
@Injectable()
export class SlaBreachService {
  private readonly logger = new Logger(SlaBreachService.name);

  constructor(private prisma: PrismaService) {}

  /** Idempotent: does nothing if an unresolved breach of this type already exists for the entity. */
  async recordBreach(data: {
    tenantId: string;
    leadId?: string;
    entityType: string;
    entityId: string;
    breachType: string;
    metadata?: Record<string, unknown>;
  }) {
    const existing = await this.prisma.slaBreach.findFirst({
      where: { tenantId: data.tenantId, entityType: data.entityType, entityId: data.entityId, breachType: data.breachType, resolvedAt: null },
    });
    if (existing) return existing;

    return this.prisma.slaBreach.create({
      data: {
        tenantId: data.tenantId,
        leadId: data.leadId,
        entityType: data.entityType,
        entityId: data.entityId,
        breachType: data.breachType,
        metadata: (data.metadata || {}) as any,
      },
    });
  }

  /** Resolves any open breach of this type for the entity — called once the underlying condition clears. */
  async resolveBreach(entityType: string, entityId: string, breachType: string) {
    const result = await this.prisma.slaBreach.updateMany({
      where: { entityType, entityId, breachType, resolvedAt: null },
      data: { resolvedAt: new Date() },
    });
    return result.count;
  }

  /**
   * Reconciles currently-breaching entities (each carrying its own tenantId,
   * since a scan can span multiple tenants) against open breach rows:
   * records new ones, resolves any that are no longer breaching. Called once
   * per scan per breachType so the open-breach table always matches reality.
   */
  async reconcile(entityType: string, breachType: string, currentlyBreaching: { tenantId: string; entityId: string; leadId?: string }[]) {
    const open = await this.prisma.slaBreach.findMany({
      where: { entityType, breachType, resolvedAt: null },
      select: { id: true, entityId: true },
    });
    const currentSet = new Set(currentlyBreaching.map(c => c.entityId));
    const openIds = new Set(open.map(b => b.entityId));

    const toResolve = open.filter(b => !currentSet.has(b.entityId)).map(b => b.id);
    if (toResolve.length > 0) {
      await this.prisma.slaBreach.updateMany({ where: { id: { in: toResolve } }, data: { resolvedAt: new Date() } });
    }

    for (const item of currentlyBreaching) {
      if (openIds.has(item.entityId)) continue;
      try {
        await this.recordBreach({ tenantId: item.tenantId, entityType, entityId: item.entityId, breachType, leadId: item.leadId });
      } catch (e: any) {
        this.logger.warn(`Failed to record SLA breach ${breachType}/${item.entityId}: ${e.message}`);
      }
    }
  }

  async findAll(tenantId: string, query: { entityType?: string; resolved?: boolean; page?: number; limit?: number }) {
    const { entityType, resolved, page = 1, limit = 20 } = query;
    const where: any = { tenantId };
    if (entityType) where.entityType = entityType;
    if (resolved !== undefined) where.resolvedAt = resolved ? { not: null } : null;

    const [data, total] = await Promise.all([
      this.prisma.slaBreach.findMany({ where, skip: (+page - 1) * +limit, take: +limit, orderBy: { detectedAt: 'desc' } }),
      this.prisma.slaBreach.count({ where }),
    ]);
    return { data, meta: { total, page: +page, limit: +limit } };
  }
}
