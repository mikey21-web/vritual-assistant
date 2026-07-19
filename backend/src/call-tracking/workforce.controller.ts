import { Controller, Get, Post, Body, Param, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { WorkforceService } from './workforce.service';

@ApiTags('Call Centre Workforce')
@Controller('workforce')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class WorkforceController {
  constructor(private service: WorkforceService) {}

  @Get('shifts') @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'SUPPORT_AGENT')
  listShifts(@Req() req: any) { return this.service.listShifts(req.user.tenantId); }

  @Post('shifts') @Roles('OWNER', 'ADMIN', 'MANAGER')
  createShift(@Body() dto: { name: string; startTime: string; endTime: string; daysOfWeek?: number[] }, @Req() req: any) {
    return this.service.createShift(req.user.tenantId, dto);
  }

  @Get('availability') @Roles('OWNER', 'ADMIN', 'MANAGER')
  listAvailability(@Req() req: any) { return this.service.listAvailability(req.user.tenantId); }

  @Post('availability/:userId') @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'SUPPORT_AGENT')
  setAvailability(@Param('userId') userId: string, @Body() dto: { status: string; shiftId?: string }, @Req() req: any) {
    return this.service.setAvailability(req.user.tenantId, userId, dto.status, dto.shiftId);
  }

  @Post('call-quality-reviews') @Roles('OWNER', 'ADMIN', 'MANAGER')
  submitQualityReview(@Body() dto: { callLogId: string; score: number; notes?: string; criteria?: Record<string, unknown> }, @Req() req: any) {
    return this.service.submitQualityReview(req.user.tenantId, { ...dto, reviewerId: req.user.id });
  }

  @Post('site-visits/:siteVisitId/attendance') @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT')
  recordVisitAttendance(
    @Param('siteVisitId') siteVisitId: string,
    @Body() dto: { method?: string; lat?: number; lng?: number },
    @Req() req: any,
  ) {
    return this.service.recordVisitAttendance(req.user.tenantId, siteVisitId, { ...dto, checkedInById: req.user.id });
  }

  @Get('manager-dashboard') @Roles('OWNER', 'ADMIN', 'MANAGER')
  managerDashboard(@Req() req: any) { return this.service.managerDashboard(req.user.tenantId); }
}
