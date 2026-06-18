import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditLogsService {
  constructor(private prisma: PrismaService) {}

  async log(action: string, entity: string, entityId?: string, userId?: string, changes?: any, metadata?: any) {
    return this.prisma.auditLog.create({ data: { action, entity, entityId, userId, changes, metadata } });
  }

  findAll(query: any = {}) {
    const { entity, entityId, userId, page = 1, limit = 50 } = query;
    const where: any = {};
    if (entity) where.entity = entity;
    if (entityId) where.entityId = entityId;
    if (userId) where.userId = userId;
    return Promise.all([
      this.prisma.auditLog.findMany({ where, skip: (+page - 1) * +limit, take: +limit, orderBy: { createdAt: 'desc' }, include: { user: { select: { id: true, name: true, email: true } } } }),
      this.prisma.auditLog.count({ where }),
    ]).then(([data, total]) => ({ data, meta: { total, page: +page, limit: +limit } }));
  }
}
