import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class MessageTemplatesService {
  constructor(private prisma: PrismaService, private auditLogs: AuditLogsService) {}

  findAll() { return this.prisma.messageTemplate.findMany({ include: { mediaFiles: true } }); }

  async findOne(id: string) { const t = await this.prisma.messageTemplate.findUnique({ where: { id }, include: { mediaFiles: true } }); if (!t) throw new NotFoundException('Template not found'); return t; }

  async create(data: any, userId?: string) { const t = await this.prisma.messageTemplate.create({ data }); await this.auditLogs.log('template_created', 'MessageTemplate', t.id, userId); return t; }

  async update(id: string, data: any, userId?: string) {
    await this.findOne(id);
    const current = await this.prisma.messageTemplate.findUnique({ where: { id } });
    const versionBump = data.body !== undefined && data.body !== current?.body;
    const t = await this.prisma.messageTemplate.update({
      where: { id },
      data: { ...data, version: (current?.version || 0) + (versionBump ? 1 : 0) },
    });
    await this.auditLogs.log('template_updated', 'MessageTemplate', id, userId, data);
    return t;
  }

  async preview(id: string, variables: Record<string, string>) {
    const template = await this.findOne(id);
    let body = template.body;
    const validVars = (template.variables as string[]) || [];
    for (const v of validVars) {
      const escaped = v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      body = body.replace(new RegExp(`{{${escaped}}}`, 'g'), variables[v] || `{{${v}}}`);
    }
    return { data: { ...template, rendered: body } };
  }
}
