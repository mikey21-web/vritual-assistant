import { Controller, Get, Post, Patch, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { NriProfilesService } from './nri-profiles.service';

@ApiTags('NRI Profiles')
@Controller('nri-profiles')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class NriProfilesController {
  constructor(private service: NriProfilesService) {}

  @Post()
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT')
  create(@Body() body: any, @Req() req: any) {
    return this.service.createProfile(req.user.tenantId, body);
  }

  @Get()
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'VIEWER')
  findAll(@Req() req: any, @Query('country') country?: string) {
    return this.service.findAll(req.user.tenantId, { country });
  }

  @Get('stats')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'VIEWER')
  stats(@Req() req: any) {
    return this.service.getStats(req.user.tenantId);
  }

  @Get(':id')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'VIEWER')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.service.findOne(req.user.tenantId, id);
  }

  @Patch(':id')
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  update(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.service.updateProfile(req.user.tenantId, id, body);
  }
}
