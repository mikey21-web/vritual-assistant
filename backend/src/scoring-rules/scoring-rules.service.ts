import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { evaluateCondition } from '../shared/scoring.util';

@Injectable()
export class ScoringRulesService {
  constructor(private prisma: PrismaService) {}

  findAll(query: any = {}) {
    const { page = 1, limit = 50 } = query;
    return Promise.all([
      this.prisma.scoringRule.findMany({ skip: (+page - 1) * +limit, take: +limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.scoringRule.count(),
    ]).then(([data, total]) => ({ data, meta: { total, page: +page, limit: +limit } }));
  }

  create(data: any) { return this.prisma.scoringRule.create({ data }); }
  async update(id: string, data: any) { const r = await this.prisma.scoringRule.findUnique({ where: { id } }); if (!r) throw new NotFoundException('Rule not found'); return this.prisma.scoringRule.update({ where: { id }, data }); }
  async remove(id: string) { const r = await this.prisma.scoringRule.findUnique({ where: { id } }); if (!r) throw new NotFoundException('Rule not found'); return this.prisma.scoringRule.delete({ where: { id } }); }

  test(data: { field: string; operator: string; value: string; points: number; testValues: Record<string, string>[] }) {
    const results = (data.testValues || []).map(tv => {
      const matched = evaluateCondition(tv[data.field], data.operator, data.value);
      return { input: tv, matched, score: matched ? data.points : 0 };
    });
    return { rule: { field: data.field, operator: data.operator, value: data.value, points: data.points }, results };
  }
}
