import { Controller, Get, Post, Patch, Param, Body, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { TenantsService } from './tenants.service';

@ApiTags('Tenants')
@Controller('tenants')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class TenantsController {
  constructor(private service: TenantsService) {}

  @Get()
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'List all tenants' })
  findAll() { return this.service.findAll(); }

  @Get('me')
  @ApiOperation({ summary: 'Get current tenant info' })
  findMe(@Req() req: any) { return this.service.findOne(req.user.tenantId); }

  @Get(':id')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Get tenant by ID' })
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Post()
  @Roles('OWNER')
  @ApiOperation({ summary: 'Create a new tenant' })
  create(@Body() data: { name: string; slug: string; domain?: string; plan?: string }) {
    return this.service.create(data);
  }

  @Patch(':id')
  @Roles('OWNER')
  @ApiOperation({ summary: 'Update tenant' })
  update(@Param('id') id: string, @Body() data: any) { return this.service.update(id, data); }

  @Get(':id/stats')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Get tenant usage statistics' })
  getStats(@Param('id') id: string) { return this.service.getStats(id); }
}
