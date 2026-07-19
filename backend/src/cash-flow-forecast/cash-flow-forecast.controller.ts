import { Controller, Get, Post, Delete, Body, Param, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CashFlowForecastService } from './cash-flow-forecast.service';

@ApiTags('Cash Flow Forecast')
@Controller('cash-flow-forecast')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class CashFlowForecastController {
  constructor(private service: CashFlowForecastService) {}

  @Post()
  @Roles('OWNER', 'ADMIN')
  create(@Body() body: any, @Req() req: any) {
    return this.service.createEntry(req.user.tenantId, body, req.user.id);
  }

  @Get('project/:projectId')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'VIEWER')
  findByProject(@Param('projectId') projectId: string, @Req() req: any) {
    return this.service.findByProject(req.user.tenantId, projectId);
  }

  @Get(':id')
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.service.findOne(req.user.tenantId, id);
  }

  @Get('summary/:projectId')
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  summary(@Param('projectId') projectId: string, @Req() req: any) {
    return this.service.getProjectSummary(projectId, req.user.tenantId);
  }

  @Delete(':id')
  @Roles('OWNER', 'ADMIN')
  delete(@Param('id') id: string, @Req() req: any) {
    return this.service.deleteEntry(req.user.tenantId, id);
  }
}
