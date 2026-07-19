import { Controller, Get, Post, Patch, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ReferralsService } from './referrals.service';

@ApiTags('Referrals')
@Controller('referrals')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ReferralsController {
  constructor(private service: ReferralsService) {}

  @Post('programs')
  @Roles('OWNER', 'ADMIN')
  createProgram(@Body() body: any, @Req() req: any) {
    return this.service.createProgram(req.user.tenantId, body);
  }

  @Get('programs')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'VIEWER')
  listPrograms(@Req() req: any, @Query('activeOnly') activeOnly?: string) {
    return this.service.listPrograms(req.user.tenantId, activeOnly === 'true');
  }

  @Get('programs/:id')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'VIEWER')
  getProgram(@Param('id') id: string, @Req() req: any) {
    return this.service.findProgram(req.user.tenantId, id);
  }

  @Post()
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT')
  createReferral(@Body() body: any, @Req() req: any) {
    return this.service.createReferral(req.user.tenantId, body);
  }

  @Patch(':id/status')
  @Roles('OWNER', 'ADMIN')
  updateStatus(@Param('id') id: string, @Body() body: { status: string }, @Req() req: any) {
    return this.service.updateReferralStatus(req.user.tenantId, id, body.status);
  }

  @Get('analytics')
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  analytics(@Req() req: any, @Query('programId') programId?: string) {
    return this.service.getAnalytics(req.user.tenantId, programId);
  }

  @Get('leaderboard')
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  leaderboard(@Req() req: any, @Query('programId') programId?: string) {
    return this.service.getLeaderboard(req.user.tenantId, programId);
  }
}
