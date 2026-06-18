import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const SUPPORTED_CONDITIONS: Record<string, (value: unknown, expected: unknown) => boolean> = {
  equals: (v, e) => String(v) === String(e),
  not_equals: (v, e) => String(v) !== String(e),
  contains: (v, e) => String(v).toLowerCase().includes(String(e).toLowerCase()),
  not_contains: (v, e) => !String(v).toLowerCase().includes(String(e).toLowerCase()),
  greater_than: (v, e) => Number(v) > Number(e),
  less_than: (v, e) => Number(v) < Number(e),
  between: (v, e) => Array.isArray(e) && Number(v) >= Number(e[0]) && Number(v) <= Number(e[1]),
  exists: (v) => v !== null && v !== undefined && v !== '',
  not_exists: (v) => v === null || v === undefined || v === '',
  in_list: (v, e) => Array.isArray(e) && e.map(String).includes(String(v)),
  not_in_list: (v, e) => Array.isArray(e) && !e.map(String).includes(String(v)),
  date_before: (v, e) => new Date(String(v)).getTime() < new Date(String(e)).getTime(),
  date_after: (v, e) => new Date(String(v)).getTime() > new Date(String(e)).getTime(),
};

@Injectable()
export class RulesService {
  constructor(private prisma: PrismaService) {}

  async findAll(category?: string) {
    const where: any = {};
    if (category) where.category = category;
    return this.prisma.automationRule.findMany({ where, orderBy: { priority: 'asc' } });
  }

  async findOne(id: string) {
    const r = await this.prisma.automationRule.findUnique({ where: { id } });
    if (!r) throw new NotFoundException('Rule not found');
    return r;
  }

  async create(data: any) {
    return this.prisma.automationRule.create({ data });
  }

  async update(id: string, data: any) {
    await this.findOne(id);
    return this.prisma.automationRule.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.automationRule.delete({ where: { id } });
  }

  async evaluateLead(lead: Record<string, unknown>, ruleId?: string) {
    const rules = ruleId
      ? [await this.findOne(ruleId)]
      : await this.prisma.automationRule.findMany({ where: { active: true, category: { in: ['scoring', 'routing', 'segment'] } }, orderBy: { priority: 'asc' } });

    const results: any[] = [];

    for (const rule of rules) {
      const conditions = typeof rule.conditions === 'string' ? JSON.parse(rule.conditions as string) : (rule.conditions as any[]);
      const allMatch = conditions.every((cond: any) => {
        const fn = SUPPORTED_CONDITIONS[cond.operator];
        if (!fn) return false;
        return fn(lead[cond.field], cond.value);
      });

      const result = {
        ruleId: rule.id,
        ruleName: rule.name,
        category: rule.category,
        matched: allMatch,
        conditions: conditions.map((c: any) => ({
          field: c.field,
          operator: c.operator,
          expected: c.value,
          actual: lead[c.field],
          passed: SUPPORTED_CONDITIONS[c.operator] ? SUPPORTED_CONDITIONS[c.operator](lead[c.field], c.value) : false,
        })),
        actions: allMatch ? rule.actions : [],
      };

      await this.prisma.ruleExecution.create({
        data: {
          ruleId: rule.id,
          result: allMatch ? 'matched' : 'not_matched',
          input: lead as any,
          output: result,
        },
      });

      results.push(result);
    }

    return { lead: Object.keys(lead).slice(0, 10), rulesEvaluated: rules.length, results };
  }

  async testConditions(conditions: any[], testLead: Record<string, unknown>) {
    const results = conditions.map(cond => ({
      field: cond.field,
      operator: cond.operator,
      expected: cond.value,
      actual: testLead[cond.field],
      passed: SUPPORTED_CONDITIONS[cond.operator] ? SUPPORTED_CONDITIONS[cond.operator](testLead[cond.field], cond.value) : false,
    }));
    return { matched: results.every(r => r.passed), results };
  }
}
