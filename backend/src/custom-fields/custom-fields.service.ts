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
      const whereKey = target === 'contact'
        ? { definitionId_contactId: { definitionId: v.definitionId, contactId: targetId } }
        : { definitionId_leadId: { definitionId: v.definitionId, leadId: targetId } };

      const createData: any = { definitionId: v.definitionId, value: v.value };
      if (target === 'contact') createData.contactId = targetId;
      else createData.leadId = targetId;

      results.push(await this.prisma.customFieldValue.upsert({
        where: whereKey as any,
        update: { value: v.value },
        create: createData,
      }));
    }
    return results;
  }
}
