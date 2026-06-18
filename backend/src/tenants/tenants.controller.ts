import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { TenantsService } from './tenants.service';

@Controller('tenants')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get()
  @Roles('OWNER', 'ADMIN')
  findAll(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.tenantsService.findAll(Number(page) || 1, Number(limit) || 50);
  }

  @Get(':id')
  @Roles('OWNER', 'ADMIN')
  findOne(@Param('id') id: string) {
    return this.tenantsService.findOne(id);
  }

  @Post()
  @Roles('OWNER', 'ADMIN')
  create(@Body() data: any) {
    return this.tenantsService.create(data);
  }

  @Patch(':id')
  @Roles('OWNER', 'ADMIN')
  update(@Param('id') id: string, @Body() data: any) {
    return this.tenantsService.update(id, data);
  }

  @Delete(':id')
  @Roles('OWNER', 'ADMIN')
  delete(@Param('id') id: string, @Query('purgeData') purgeData?: string) {
    return this.tenantsService.delete(id, purgeData === 'true');
  }

  @Post(':id/provision')
  @Roles('OWNER', 'ADMIN')
  provision(@Param('id') tenantId: string, @Body() body: any, @Req() req: any) {
    return this.tenantsService.provision(
      tenantId,
      body.templateId,
      req.user?.sub,
      body.adminEmail,
      body.adminPassword,
      body.adminName,
    );
  }

  @Get('me/myniche')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'SUPPORT_AGENT', 'VIEWER')
  getMyNiche(@Req() req: any) {
    return this.tenantsService.getMyNiche(req.user?.tenantId);
  }
}
