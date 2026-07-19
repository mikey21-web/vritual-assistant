import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TimelineService } from '../timeline/timeline.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { PossessionCaseStatus } from '@prisma/client';

/** Possession preconditions tracked as explicit booleans (spec 68.3) — never issued just because a date passed. */
@Injectable()
export class PossessionService {
  constructor(
    private prisma: PrismaService,
    private timeline: TimelineService,
    private auditLogs: AuditLogsService,
  ) {}

  async getOrCreate(tenantId: string, bookingId: string) {
    const booking = await this.prisma.booking.findFirst({ where: { id: bookingId, tenantId } });
    if (!booking) throw new NotFoundException('Booking not found');
    return this.prisma.possessionCase.upsert({
      where: { bookingId },
      create: { tenantId, bookingId },
      update: {},
    });
  }

  async confirmPrecondition(tenantId: string, bookingId: string, field: 'accountClearanceConfirmed' | 'documentClearanceConfirmed' | 'unitReadinessConfirmed', actorId?: string) {
    await this.getOrCreate(tenantId, bookingId);
    const updated = await this.prisma.possessionCase.update({
      where: { bookingId },
      data: { [field]: true, status: PossessionCaseStatus.PRECONDITIONS_PENDING },
    });
    await this.auditLogs.log('CONFIRM_PRECONDITION', 'PossessionCase', updated.id, actorId, { field });
    if (updated.accountClearanceConfirmed && updated.documentClearanceConfirmed && updated.unitReadinessConfirmed) {
      return this.prisma.possessionCase.update({ where: { bookingId }, data: { status: PossessionCaseStatus.READY } });
    }
    return updated;
  }

  /** Requires the post-sales stage to already be POSSESSION_OFFERED — offering possession isn't just clicking a button here, it's gated by PostSalesService.advance. */
  async recordOffered(tenantId: string, bookingId: string, actorId?: string) {
    const booking = await this.prisma.booking.findFirst({ where: { id: bookingId, tenantId } });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.postSalesStage !== 'POSSESSION_OFFERED') throw new ForbiddenException('Booking has not reached POSSESSION_OFFERED stage yet');
    const updated = await this.prisma.possessionCase.update({ where: { bookingId }, data: { status: PossessionCaseStatus.OFFERED, possessionOfferedAt: new Date() } });
    await this.timeline.add({ type: 'possession_offered', title: 'Possession offered to buyer', leadId: booking.leadId, metadata: { bookingId }, createdById: actorId });
    return updated;
  }

  /** Staff-recorded buyer acknowledgement — real signature/e-sign capture is a separate, later concern; this just records the fact and who attested it. */
  async recordAcknowledged(tenantId: string, bookingId: string, actorId: string) {
    const c = await this.prisma.possessionCase.findFirst({ where: { tenantId, bookingId } });
    if (!c) throw new NotFoundException('Possession case not found');
    if (c.status !== PossessionCaseStatus.OFFERED) throw new ForbiddenException(`Possession is ${c.status}, not OFFERED`);
    const updated = await this.prisma.possessionCase.update({
      where: { bookingId },
      data: { status: PossessionCaseStatus.ACKNOWLEDGED, possessionAcknowledgedAt: new Date(), possessionAcknowledgedById: actorId },
    });
    await this.auditLogs.log('ACKNOWLEDGE', 'PossessionCase', c.id, actorId, {});
    return updated;
  }

  async recordHandedOver(tenantId: string, bookingId: string, actorId?: string) {
    const c = await this.prisma.possessionCase.findFirst({ where: { tenantId, bookingId } });
    if (!c) throw new NotFoundException('Possession case not found');
    if (c.status !== PossessionCaseStatus.ACKNOWLEDGED) throw new ForbiddenException(`Possession is ${c.status}, not ACKNOWLEDGED`);
    const updated = await this.prisma.possessionCase.update({ where: { bookingId }, data: { status: PossessionCaseStatus.HANDED_OVER, keyHandoverAt: new Date() } });
    await this.timeline.add({ type: 'handed_over', title: 'Unit handed over to buyer', metadata: { bookingId }, createdById: actorId });
    return updated;
  }
}
