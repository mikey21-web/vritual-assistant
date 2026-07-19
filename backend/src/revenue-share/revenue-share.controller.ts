import { Controller, Get, Post, Patch, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { RevenueShareService } from './revenue-share.service';

@ApiTags('Revenue Share')
@Controller('revenue-share')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class RevenueShareController {
  constructor(private service: RevenueShareService) {}

  @Post('parties')
  @Roles('OWNER', 'ADMIN')
  createParty(@Body() body: any, @Req() req: any) {
    return this.service.createParty(req.user.tenantId, body);
  }

  @Get('parties')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'VIEWER')
  listParties(@Req() req: any, @Query('projectId') projectId?: string) {
    return this.service.findAllParties(req.user.tenantId, projectId);
  }

  @Get('parties/:id')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'VIEWER')
  getParty(@Param('id') id: string, @Req() req: any) {
    return this.service.findParty(req.user.tenantId, id);
  }

  @Post('allocations')
  @Roles('OWNER', 'ADMIN')
  createAllocation(@Body() body: any, @Req() req: any) {
    return this.service.createAllocation(req.user.tenantId, body);
  }

  @Patch('allocations/:id/status')
  @Roles('OWNER', 'ADMIN')
  updateAllocationStatus(@Param('id') id: string, @Body() body: { status: string }, @Req() req: any) {
    return this.service.updateAllocationStatus(req.user.tenantId, id, body.status);
  }

  @Get('reports/settlement/:projectId')
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  settlementReport(@Param('projectId') projectId: string, @Req() req: any) {
    return this.service.getSettlementReport(projectId, req.user.tenantId);
  }
}
