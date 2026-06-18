import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TasksService {
  constructor(private prisma: PrismaService) {}

  findAll(query: any = {}) {
    const { status, assigneeId, leadId, page = 1, limit = 20 } = query;
    const where: any = {};
    if (status) where.status = status;
    if (assigneeId) where.assigneeId = assigneeId;
    if (leadId) where.leadId = leadId;
    return Promise.all([
      this.prisma.task.findMany({ where, skip: (+page - 1) * +limit, take: +limit, orderBy: { createdAt: 'desc' }, include: { lead: { select: { id: true, contact: { select: { name: true } } } }, assignee: { select: { id: true, name: true } } } }),
      this.prisma.task.count({ where }),
    ]).then(([data, total]) => ({ data, meta: { total, page: +page, limit: +limit } }));
  }

  async findOne(id: string) {
    const t = await this.prisma.task.findUnique({ where: { id }, include: { lead: true, assignee: true } });
    if (!t) throw new NotFoundException('Task not found');
    return t;
  }

  create(data: any) { return this.prisma.task.create({ data }); }

  async update(id: string, data: any) { await this.findOne(id); return this.prisma.task.update({ where: { id }, data }); }
}
