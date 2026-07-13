import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { TeamOpsService } from './team-ops.service';
import { CreateLeaveRequestDto, UpdateLeaveRequestDto, CreateSalaryRecordDto, CreateTimesheetEntryDto, UpdateTeamMemberDto } from './dto/team-ops.dto';

const WRITE_ROLES = ['OWNER', 'ADMIN', 'MANAGER'] as const;
const READ_ROLES = ['OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'SUPPORT_AGENT'] as const;

@ApiTags('TeamOps')
@Controller('team-ops')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class TeamOpsController {
  constructor(private service: TeamOpsService) {}

  @Get('leave-requests') @Roles(...READ_ROLES) findLeaveRequests() { return this.service.findLeaveRequests(); }
  @Get('leave-requests/stats') @Roles(...READ_ROLES) leaveStats() { return this.service.leaveStats(); }
  @Post('leave-requests') @Roles(...WRITE_ROLES) createLeaveRequest(@Body() d: CreateLeaveRequestDto) { return this.service.createLeaveRequest(d); }
  @Patch('leave-requests/:id') @Roles(...WRITE_ROLES) updateLeaveRequest(@Param('id') id: string, @Body() d: UpdateLeaveRequestDto) { return this.service.updateLeaveRequest(id, d); }

  @Get('payroll') @Roles(...READ_ROLES) listPayroll() { return this.service.listPayroll(); }
  @Post('payroll') @Roles(...WRITE_ROLES) createSalaryRecord(@Body() d: CreateSalaryRecordDto) { return this.service.createSalaryRecord(d); }

  @Get('timesheet') @Roles(...READ_ROLES) findTimesheet(@Query() q: { eventId?: string; userId?: string }) { return this.service.findTimesheetEntries(q); }
  @Post('timesheet') @Roles(...WRITE_ROLES) createTimesheetEntry(@Body() d: CreateTimesheetEntryDto) { return this.service.createTimesheetEntry(d); }

  @Patch('members/:id') @Roles(...WRITE_ROLES) updateTeamMember(@Param('id') id: string, @Body() d: UpdateTeamMemberDto) { return this.service.updateTeamMember(id, d); }
}
