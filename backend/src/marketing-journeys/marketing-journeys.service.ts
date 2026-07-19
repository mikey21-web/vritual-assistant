import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TimelineService } from '../timeline/timeline.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { JourneyStatus, JourneyStepType } from '@prisma/client';

@Injectable()
export class MarketingJourneysService {
  constructor(
    private prisma: PrismaService,
    private timeline: TimelineService,
    private auditLogs: AuditLogsService,
  ) {}

  async createJourney(tenantId: string, data: { name: string; entryEventType: string; entryConditions?: any }, createdById?: string) {
    const journey = await this.prisma.marketingJourney.create({
      data: {
        tenantId,
        name: data.name,
        entryEventType: data.entryEventType,
        entryConditions: data.entryConditions || {},
      },
    });
    await this.auditLogs.log('CREATE', 'MarketingJourney', journey.id, createdById, { after: journey });
    return journey;
  }

  async findAll(tenantId: string) {
    return this.prisma.marketingJourney.findMany({
      where: { tenantId },
      include: { steps: { orderBy: { order: 'asc' } }, _count: { select: { enrollments: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const journey = await this.prisma.marketingJourney.findFirst({
      where: { id, tenantId },
      include: { steps: { orderBy: { order: 'asc' } }, enrollments: { include: { lead: { select: { id: true, contact: { select: { name: true, phone: true } } } } } } },
    });
    if (!journey) throw new NotFoundException('Marketing journey not found');
    return journey;
  }

  async addStep(tenantId: string, journeyId: string, data: { order: number; stepType: JourneyStepType; config?: any }) {
    const journey = await this.prisma.marketingJourney.findFirst({ where: { id: journeyId, tenantId } });
    if (!journey) throw new NotFoundException('Marketing journey not found');

    const step = await this.prisma.marketingJourneyStep.create({
      data: { journeyId, order: data.order, stepType: data.stepType, config: data.config || {} },
    });
    await this.auditLogs.log('ADD_STEP', 'MarketingJourneyStep', step.id, undefined, { after: step });
    return step;
  }

  async activateJourney(tenantId: string, id: string, actorId?: string) {
    const journey = await this.prisma.marketingJourney.findFirst({ where: { id, tenantId } });
    if (!journey) throw new NotFoundException('Marketing journey not found');
    if (journey.status !== JourneyStatus.DRAFT) {
      throw new ForbiddenException(`Cannot activate a journey in status ${journey.status}`);
    }
    const updated = await this.prisma.marketingJourney.update({
      where: { id },
      data: { status: JourneyStatus.ACTIVE },
    });
    await this.auditLogs.log('ACTIVATE', 'MarketingJourney', id, actorId, { before: journey, after: updated });
    return updated;
  }

  async pauseJourney(tenantId: string, id: string, actorId?: string) {
    const journey = await this.prisma.marketingJourney.findFirst({ where: { id, tenantId } });
    if (!journey) throw new NotFoundException('Marketing journey not found');
    if (journey.status !== JourneyStatus.ACTIVE) {
      throw new ForbiddenException(`Cannot pause a journey in status ${journey.status}`);
    }
    const updated = await this.prisma.marketingJourney.update({
      where: { id },
      data: { status: JourneyStatus.PAUSED },
    });
    await this.auditLogs.log('PAUSE', 'MarketingJourney', id, actorId, { before: journey, after: updated });
    return updated;
  }

  async previewAudience(tenantId: string, journeyId: string) {
    const journey = await this.prisma.marketingJourney.findFirst({ where: { id: journeyId, tenantId } });
    if (!journey) throw new NotFoundException('Marketing journey not found');

    const conditions = journey.entryConditions as any;
    const where: any = { tenantId };

    // Build filter from entryConditions — e.g. { source: "MAGICBRICKS", status: "NEW" }
    if (conditions.source) where.source = conditions.source;
    if (conditions.status) where.status = conditions.status;
    if (conditions.segment) where.segment = conditions.segment;

    const [count, sample] = await Promise.all([
      this.prisma.lead.count({ where }),
      this.prisma.lead.findMany({ where, take: 10, orderBy: { createdAt: 'desc' }, include: { contact: { select: { name: true, phone: true } } } }),
    ]);

    return { count, sample };
  }

  async enrollLead(tenantId: string, journeyId: string, leadId: string, actorId?: string) {
    const journey = await this.prisma.marketingJourney.findFirst({ where: { id: journeyId, tenantId } });
    if (!journey) throw new NotFoundException('Marketing journey not found');

    const lead = await this.prisma.lead.findFirst({ where: { id: leadId, tenantId } });
    if (!lead) throw new NotFoundException('Lead not found');

    // Prevent duplicate enrollment
    const existing = await this.prisma.marketingJourneyEnrollment.findFirst({
      where: { journeyId, leadId, status: { in: ['ACTIVE'] } },
    });
    if (existing) throw new BadRequestException('Lead is already enrolled in this journey');

    // Snapshot the current version and steps at enrollment time
    const steps = await this.prisma.marketingJourneyStep.findMany({
      where: { journeyId },
      orderBy: { order: 'asc' },
    });

    const enrollment = await this.prisma.marketingJourneyEnrollment.create({
      data: {
        tenantId,
        journeyId,
        leadId,
        currentStepOrder: 0,
        journeySnapshot: { version: journey.version, steps: steps.map(s => ({ order: s.order, stepType: s.stepType, config: s.config })) },
      },
    });

    await this.timeline.add({
      type: 'journey_enrolled',
      title: `Enrolled in marketing journey: ${journey.name}`,
      leadId,
      metadata: { journeyId, enrollmentId: enrollment.id },
      createdById: actorId,
    });
    await this.auditLogs.log('ENROLL', 'MarketingJourneyEnrollment', enrollment.id, actorId, { journeyId, leadId });
    return enrollment;
  }

  /**
   * Idempotent processing stub — advances enrollments through their steps.
   * Safe to call repeatedly. In production this would be wired to a scheduler.
   */
  async processEnrollments(tenantId?: string): Promise<number> {
    const where: any = { status: 'ACTIVE' };
    if (tenantId) where.tenantId = tenantId;

    const enrollments = await this.prisma.marketingJourneyEnrollment.findMany({
      where,
      include: { journey: { include: { steps: { orderBy: { order: 'asc' } } } } },
      take: 50,
    });

    let processed = 0;
    for (const enrollment of enrollments) {
      const steps = enrollment.journey.steps;
      const currentStep = steps.find(s => s.order === enrollment.currentStepOrder);
      if (!currentStep) {
        // No more steps — mark completed
        await this.prisma.marketingJourneyEnrollment.update({
          where: { id: enrollment.id },
          data: { status: 'COMPLETED', completedAt: new Date() },
        });
        processed++;
        continue;
      }
      // Stub: in production, actual step execution (WAIT timer, SEND_TEMPLATE, etc.)
      // would be implemented here or dispatched to a job queue.
      // For now, just advance to the next step or complete.
      const nextOrder = enrollment.currentStepOrder + 1;
      const hasMoreSteps = steps.some(s => s.order === nextOrder);
      await this.prisma.marketingJourneyEnrollment.update({
        where: { id: enrollment.id },
        data: {
          currentStepOrder: nextOrder,
          status: hasMoreSteps ? 'ACTIVE' : 'COMPLETED',
          completedAt: hasMoreSteps ? null : new Date(),
        },
      });
      processed++;
    }
    return processed;
  }
}
