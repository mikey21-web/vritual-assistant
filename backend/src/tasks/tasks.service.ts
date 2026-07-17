import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TasksService {
  constructor(private prisma: PrismaService) {}

  findAll(query: any = {}) {
    const { status, assigneeId, leadId, createdBy, page = 1, limit = 20 } = query;
    const where: any = {};
    if (status) where.status = status;
    if (assigneeId) where.assigneeId = assigneeId;
    if (leadId) where.leadId = leadId;
    if (createdBy) where.createdBy = createdBy;
    return Promise.all([
      this.prisma.task.findMany({
        where, skip: (+page - 1) * +limit, take: +limit, orderBy: { createdAt: 'desc' },
        include: { lead: { select: { id: true, contact: { select: { name: true, phone: true } } } }, assignee: { select: { id: true, name: true } } },
      }),
      this.prisma.task.count({ where }),
    ]).then(([data, total]) => ({ data, meta: { total, page: +page, limit: +limit } }));
  }

  async findOne(id: string) {
    const t = await this.prisma.task.findUnique({
      where: { id },
      include: { lead: { select: { id: true, contact: { select: { name: true, phone: true } }, dealValue: true, status: true, interest: true } }, assignee: { select: { id: true, name: true } } },
    });
    if (!t) throw new NotFoundException('Task not found');
    return t;
  }

  async findByLead(leadId: string) {
    return this.prisma.task.findMany({
      where: { leadId },
      orderBy: [{ status: 'asc' }, { priority: 'asc' }, { createdAt: 'desc' }],
      include: { assignee: { select: { id: true, name: true } } },
    });
  }

  create(data: any) {
    return this.prisma.task.create({
      data: {
        title: data.title,
        description: data.description,
        priority: data.priority || 'medium',
        dueAt: data.dueAt ? new Date(data.dueAt) : undefined,
        leadId: data.leadId,
        assigneeId: data.assigneeId,
        createdBy: data.createdBy || 'agent',
        source: data.source || 'manual',
        status: data.status || 'pending',
      },
      include: { assignee: { select: { id: true, name: true } } },
    });
  }

  async update(id: string, data: any) {
    await this.findOne(id);
    return this.prisma.task.update({
      where: { id },
      data: {
        ...data,
        dueAt: data.dueAt ? new Date(data.dueAt) : undefined,
      },
      include: { assignee: { select: { id: true, name: true } } },
    });
  }

  async getPipelineDeals(tenantId: string) {
    const [stages, leads] = await Promise.all([
      this.prisma.pipelineStage.findMany({ orderBy: { order: 'asc' } }),
      this.prisma.lead.findMany({
        where: { tenantId, status: { notIn: ['CONVERTED', 'LOST', 'SPAM'] } },
        include: {
          contact: { select: { id: true, name: true, phone: true, email: true } },
          assignedAgent: { select: { id: true, name: true } },
          _count: { select: { tasks: true } },
          tasks: {
            where: { status: { not: 'done' } },
            orderBy: { createdAt: 'desc' },
            take: 3,
            include: { assignee: { select: { id: true, name: true } } },
          },
          bookedUnits: { take: 1, include: { tower: { include: { project: { select: { id: true, name: true } } } } } },
        },
        orderBy: [{ score: 'desc' }, { updatedAt: 'desc' }],
      }),
    ]);

    const grouped: Record<string, any[]> = {};
    for (const s of stages) grouped[s.status] = [];
    for (const lead of leads) {
      const status = lead.status;
      if (!grouped[status]) grouped[status] = [];
      grouped[status].push({
        id: lead.id,
        contact: lead.contact,
        assignedAgent: lead.assignedAgent,
        status: lead.status,
        segment: lead.segment,
        score: lead.score,
        dealValue: lead.dealValue,
        interest: lead.interest,
        budget: lead.budget,
        unit: lead.bookedUnits?.[0] ? {
          projectName: (lead.bookedUnits[0].tower as any)?.project?.name,
          towerName: (lead.bookedUnits[0].tower as any)?.name,
        } : null,
        taskCount: lead._count.tasks,
        pendingTasks: lead.tasks,
        updatedAt: lead.updatedAt,
      });
    }

    return {
      stages: stages.map(s => ({
        id: s.id,
        name: s.name,
        status: s.status,
        color: s.color,
        order: s.order,
        isEnd: s.isEnd,
        count: (grouped[s.status] || []).length,
      })),
      deals: grouped,
    };
  }
}
