import { Controller, Get, Post, Body, Param, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { InterestService } from './interest.service';

@ApiTags('Interest & Credit Notes')
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class InterestController {
  constructor(private service: InterestService) {}

  @Get('interest-policies')
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  find(@Req() req: any) { return this.service.findPolicies(req.user.tenantId); }

  @Post('interest-policies')
  @Roles('OWNER', 'ADMIN')
  create(@Body() dto: { name: string; ratePercentPerMonth: number; graceDays?: number }, @Req() req: any) {
    return this.service.createPolicy(req.user.tenantId, dto);
  }

  @Post('payment-schedules/:id/compute-overdue-charge')
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  compute(@Param('id') id: string, @Body('policyId') policyId: string, @Req() req: any) {
    return this.service.computeOverdueCharge(req.user.tenantId, id, policyId, req.user.id);
  }

  @Get('bookings/:bookingId/credit-notes')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SUPPORT_AGENT')
  findNotes(@Param('bookingId') bookingId: string, @Req() req: any) { return this.service.findCreditNotes(req.user.tenantId, bookingId); }

  @Post('credit-notes')
  @Roles('OWNER', 'ADMIN')
  createNote(@Body() dto: { bookingId: string; type: 'WAIVER' | 'CORRECTION'; amountPaise: number; reason: string }, @Req() req: any) {
    return this.service.createCreditNote(req.user.tenantId, dto, req.user.id);
  }
}
