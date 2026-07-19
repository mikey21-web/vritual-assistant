import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentSchedulesService } from './payment-schedules.service';
import { PaymentPlanType } from '@prisma/client';

interface Milestone {
  label: string;
  percentage: number;
  dueOffsetDays?: number;
  triggerNote?: string;
}

@Injectable()
export class PaymentPlanTemplatesService {
  constructor(
    private prisma: PrismaService,
    private paymentSchedules: PaymentSchedulesService,
  ) {}

  async create(tenantId: string, data: { name: string; planType: PaymentPlanType; milestones: Milestone[] }) {
    const total = data.milestones.reduce((sum, m) => sum + m.percentage, 0);
    if (Math.round(total) !== 100) {
      throw new BadRequestException(`Milestone percentages must sum to 100 (got ${total})`);
    }
    return this.prisma.paymentPlanTemplate.create({
      data: { tenantId, name: data.name, planType: data.planType, milestones: data.milestones as any },
    });
  }

  async findAll(tenantId: string, query: { planType?: string; active?: boolean }) {
    const where: any = { tenantId };
    if (query.planType) where.planType = query.planType;
    if (query.active !== undefined) where.active = query.active;
    return this.prisma.paymentPlanTemplate.findMany({ where, orderBy: { createdAt: 'desc' } });
  }

  async deactivate(tenantId: string, id: string) {
    const template = await this.prisma.paymentPlanTemplate.findFirst({ where: { id, tenantId } });
    if (!template) throw new NotFoundException('Payment plan template not found');
    return this.prisma.paymentPlanTemplate.update({ where: { id }, data: { active: false } });
  }

  /**
   * Instantiates real PaymentSchedule rows from a template against a booking
   * amount. Construction-linked milestones (no dueOffsetDays) are created
   * without a due date and a note — this app has no way to know real-world
   * construction progress, so staff must set the due date manually once that
   * stage is actually reached (spec 16 / never-guess rule).
   */
  async generateSchedule(tenantId: string, data: {
    templateId: string;
    leadId: string;
    bookingId: string;
    totalAmount: number;
    bookingDate?: Date;
  }) {
    const template = await this.prisma.paymentPlanTemplate.findFirst({ where: { id: data.templateId, tenantId } });
    if (!template) throw new NotFoundException('Payment plan template not found');

    const milestones = template.milestones as unknown as Milestone[];
    const bookingDate = data.bookingDate || new Date();

    const created: Awaited<ReturnType<PaymentSchedulesService['create']>>[] = [];
    for (const m of milestones) {
      const amount = Math.round((data.totalAmount * m.percentage) / 100 * 100) / 100;
      const dueDate = m.dueOffsetDays != null
        ? new Date(bookingDate.getTime() + m.dueOffsetDays * 24 * 60 * 60 * 1000).toISOString()
        : undefined;

      const ps = await this.paymentSchedules.create({
        tenantId,
        leadId: data.leadId,
        bookingId: data.bookingId,
        label: m.triggerNote ? `${m.label} (${m.triggerNote})` : m.label,
        amount,
        dueDate,
      });
      created.push(ps);
    }
    return created;
  }
}
