import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RoutingRulesService {
  constructor(private prisma: PrismaService) {}

  findAll(query: any = {}) {
    const { page = 1, limit = 50 } = query;
    return Promise.all([
      this.prisma.routingRule.findMany({ skip: (+page - 1) * +limit, take: +limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.routingRule.count(),
    ]).then(([data, total]) => ({ data, meta: { total, page: +page, limit: +limit } }));
  }

  create(data: any) { return this.prisma.routingRule.create({ data }); }
  async update(id: string, data: any) { const r = await this.prisma.routingRule.findUnique({ where: { id } }); if (!r) throw new NotFoundException('Rule not found'); return this.prisma.routingRule.update({ where: { id }, data }); }
  async remove(id: string) { const r = await this.prisma.routingRule.findUnique({ where: { id } }); if (!r) throw new NotFoundException('Rule not found'); return this.prisma.routingRule.delete({ where: { id } }); }

  async test(data: { conditions: Record<string, string>; testLead: Record<string, any> }) {
    const conditions = data.conditions || {}; const lead = data.testLead || {};
    const results: Record<string, boolean> = {};
    for (const [field, expected] of Object.entries(conditions)) results[field] = String(lead[field] || '').toLowerCase() === String(expected).toLowerCase();
    return { matched: Object.values(results).every(Boolean), results };
  }
}
