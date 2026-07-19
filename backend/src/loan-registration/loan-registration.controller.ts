import { Controller, Get, Patch, Body, Param, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { LoanRegistrationService } from './loan-registration.service';

@ApiTags('Loan & Registration')
@Controller('bookings/:bookingId/loan-registration')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class LoanRegistrationController {
  constructor(private service: LoanRegistrationService) {}

  @Get()
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SUPPORT_AGENT', 'VIEWER')
  get(@Param('bookingId') bookingId: string, @Req() req: any) { return this.service.getOrCreate(req.user.tenantId, bookingId); }

  @Get('workspace')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SUPPORT_AGENT', 'VIEWER')
  workspace(@Param('bookingId') bookingId: string, @Req() req: any) { return this.service.getWorkspace(req.user.tenantId, bookingId); }

  @Patch()
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SUPPORT_AGENT')
  update(@Param('bookingId') bookingId: string, @Body() dto: any, @Req() req: any) { return this.service.update(req.user.tenantId, bookingId, dto); }
}
