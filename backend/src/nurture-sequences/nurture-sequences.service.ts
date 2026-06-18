import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NurtureSequencesService {
  constructor(private prisma: PrismaService) {}

  findAll(query: any = {}) {
    const { page = 1, limit = 20 } = query;
    return Promise.all([
      this.prisma.nurtureSequence.findMany({ skip: (+page - 1) * +limit, take: +limit, orderBy: { createdAt: 'desc' }, include: { steps: { orderBy: { displayOrder: 'asc' } } } }),
      this.prisma.nurtureSequence.count(),
    ]).then(([data, total]) => ({ data, meta: { total, page: +page, limit: +limit } }));
  }

  async findOne(id: string) { const s = await this.prisma.nurtureSequence.findUnique({ where: { id }, include: { steps: { orderBy: { displayOrder: 'asc' } } } }); if (!s) throw new NotFoundException('Sequence not found'); return s; }
  create(data: any) { return this.prisma.nurtureSequence.create({ data }); }
  async update(id: string, data: any) { await this.findOne(id); return this.prisma.nurtureSequence.update({ where: { id }, data }); }
  addStep(sequenceId: string, data: any) { return this.prisma.nurtureStep.create({ data: { ...data, sequenceId } }); }
  async updateStep(sequenceId: string, stepId: string, data: any) { return this.prisma.nurtureStep.update({ where: { id: stepId }, data }); }
  async deleteStep(sequenceId: string, stepId: string) { return this.prisma.nurtureStep.delete({ where: { id: stepId } }); }
}
