import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ReportsService } from './reports.service';

@ApiTags('Reports')
@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ReportsController {
  constructor(private service: ReportsService) {}

  @Get()
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'VIEWER', 'SALES_AGENT')
  findAll(@Req() req: any) {
    return this.service.findAll(req.user.tenantId, req.user.id);
  }

  @Get(':id')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'VIEWER', 'SALES_AGENT')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.service.findOne(id, req.user.tenantId);
  }

  @Post()
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  create(@Body() body: { name: string; entity: string; config: any; isShared?: boolean }, @Req() req: any) {
    return this.service.create(body, req.user.tenantId, req.user.id);
  }

  @Patch(':id')
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  update(@Param('id') id: string, @Body() body: { name?: string; config?: any; isShared?: boolean }, @Req() req: any) {
    return this.service.update(id, body, req.user.tenantId, req.user.id);
  }

  @Delete(':id')
  @Roles('OWNER', 'ADMIN')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.service.remove(id, req.user.tenantId, req.user.id);
  }

  @Post('run')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'VIEWER', 'SALES_AGENT')
  run(@Body() body: { entity: string; metric: string; groupBy?: string; filters?: Record<string, string>[]; dateRange?: { from?: string; to?: string } }, @Req() req: any) {
    return this.service.run(body, req.user.tenantId);
  }
}
