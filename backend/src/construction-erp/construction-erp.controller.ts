import { Controller, Get, Post, Body, Param, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ConstructionErpService } from './construction-erp.service';

@ApiTags('Construction ERP Integration')
@Controller('construction-erp')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ConstructionErpController {
  constructor(private service: ConstructionErpService) {}

  @Post('connections')
  @Roles('OWNER', 'ADMIN')
  configure(@Body() body: any, @Req() req: any) {
    return this.service.configureConnection(req.user.tenantId, body);
  }

  @Get('connections')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'VIEWER')
  listConnections(@Req() req: any) {
    return this.service.getConnections(req.user.tenantId);
  }

  @Post('milestones')
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  recordMilestone(@Body() body: any, @Req() req: any) {
    return this.service.recordMilestone(req.user.tenantId, body);
  }

  @Get('milestones/:projectId')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'VIEWER')
  getMilestones(@Param('projectId') projectId: string, @Req() req: any) {
    return this.service.getMilestones(req.user.tenantId, projectId);
  }

  @Post('webhook/:provider')
  async webhook(@Param('provider') provider: string, @Body() body: any) {
    return this.service.handleWebhook(body._tenantId || 'unknown', provider, body);
  }

  @Get('progress/:projectId')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'VIEWER')
  progress(@Param('projectId') projectId: string, @Req() req: any) {
    return this.service.getProjectProgress(projectId, req.user.tenantId);
  }

  @Post('milestones/:id/approve-for-buyers')
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  approveForBuyers(@Param('id') id: string, @Body('customerVisibleMessage') message: string, @Req() req: any) {
    return this.service.approveForBuyers(req.user.tenantId, id, message, req.user.id);
  }
}
