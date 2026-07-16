import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CustomFieldsService {
  constructor(private prisma: PrismaService) {}

  async findAllDefinitions(query: any = {}) {
    const { target, page = 1, limit = 50 } = query;
    const where: any = {};
    if (target) where.target = target;
    const [data, total] = await Promise.all([
      this.prisma.customFieldDefinition.findMany({ where, skip: (+page - 1) * +limit, take: +limit, orderBy: { displayOrder: 'asc' } }),
      this.prisma.customFieldDefinition.count({ where }),
    ]);
    return { data, meta: { total, page: +page, limit: +limit } };
  }

  async createDefinition(data: any) {
    try {
      return await this.prisma.customFieldDefinition.create({ data });
    } catch (err: any) {
      if (err.code === 'P2002') throw new ConflictException('A field with this key already exists for this target');
      throw err;
    }
  }

  async updateDefinition(id: string, data: any) {
    if (data.key || data.type) throw new BadRequestException('Cannot change key or type after creation');
    const d = await this.prisma.customFieldDefinition.findUnique({ where: { id } });
    if (!d) throw new NotFoundException('Custom field definition not found');
    return this.prisma.customFieldDefinition.update({ where: { id }, data });
  }

  async removeDefinition(id: string) {
    const d = await this.prisma.customFieldDefinition.findUnique({ where: { id } });
    if (!d) throw new NotFoundException('Custom field definition not found');
    return this.prisma.customFieldDefinition.update({ where: { id }, data: { active: false } });
  }

  async reorder(ids: string[]) {
    await this.prisma.$transaction(
      ids.map((id, index) => this.prisma.customFieldDefinition.update({ where: { id }, data: { displayOrder: index } }))
    );
    return { success: true };
  }

  async getValues(target: string, targetId: string) {
    const where = target === 'contact' ? { contactId: targetId }
      : target === 'ticket' ? { ticketId: targetId }
      : target === 'team_member' ? { userId: targetId }
      : { leadId: targetId };
    return this.prisma.customFieldValue.findMany({ where, include: { definition: true } });
  }

  async setValues(target: string, targetId: string, values: { definitionId: string; value: string }[]) {
    const results: any[] = [];
    for (const v of values) {
      let whereKey: any;
      const createData: any = { definitionId: v.definitionId, value: v.value };
      if (target === 'contact') {
        whereKey = { definitionId_contactId: { definitionId: v.definitionId, contactId: targetId } };
        createData.contactId = targetId;
      } else if (target === 'ticket') {
        whereKey = { definitionId_ticketId: { definitionId: v.definitionId, ticketId: targetId } };
        createData.ticketId = targetId;
      } else if (target === 'team_member') {
        whereKey = { definitionId_userId: { definitionId: v.definitionId, userId: targetId } };
        createData.userId = targetId;
      } else {
        whereKey = { definitionId_leadId: { definitionId: v.definitionId, leadId: targetId } };
        createData.leadId = targetId;
      }
      results.push(await this.prisma.customFieldValue.upsert({
        where: whereKey as any,
        update: { value: v.value },
        create: createData,
      }));
    }
    return results;
  }
}
