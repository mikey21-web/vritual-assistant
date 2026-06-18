import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CustomFieldsService {
  constructor(private prisma: PrismaService) {}

  findAllDefinitions(query: any = {}) {
    const { page = 1, limit = 50 } = query;
    return Promise.all([this.prisma.customFieldDefinition.findMany({ skip: (+page - 1) * +limit, take: +limit, orderBy: { displayOrder: 'asc' } }), this.prisma.customFieldDefinition.count()]).then(([data, total]) => ({ data, meta: { total, page: +page, limit: +limit } }));
  }
  async createDefinition(data: any) { return this.prisma.customFieldDefinition.create({ data }); }
  async updateDefinition(id: string, data: any) { const d = await this.prisma.customFieldDefinition.findUnique({ where: { id } }); if (!d) throw new NotFoundException('Custom field definition not found'); return this.prisma.customFieldDefinition.update({ where: { id }, data }); }
  async removeDefinition(id: string) { await this.prisma.customFieldDefinition.delete({ where: { id } }); return { deleted: true }; }
  async getValues(target: string, targetId: string) { return this.prisma.customFieldValue.findMany({ where: target === 'contact' ? { contactId: targetId } : { leadId: targetId }, include: { definition: true } }); }

  async setValues(target: string, targetId: string, values: { definitionId: string; value: string }[]) {
    const results: any[] = [];
    for (const v of values) {
      const existing = await this.prisma.customFieldValue.findFirst({ where: { definitionId: v.definitionId, ...(target === 'contact' ? { contactId: targetId } : { leadId: targetId }) } });
      if (existing) results.push(await this.prisma.customFieldValue.update({ where: { id: existing.id }, data: { value: v.value } }));
      else results.push(await this.prisma.customFieldValue.create({ data: { definitionId: v.definitionId, value: v.value, ...(target === 'contact' ? { contactId: targetId } : { leadId: targetId }) } }));
    }
    return results;
  }
}
