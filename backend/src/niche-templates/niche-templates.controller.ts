import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { NicheTemplatesService } from './niche-templates.service';

@ApiTags('Niche Templates')
@Controller('niche-templates')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class NicheTemplatesController {
  constructor(private svc: NicheTemplatesService) {}

  // === MASTER TEMPLATE (OWNER/ADMIN only) ===

  @Get() @Roles('OWNER', 'ADMIN')
  findAll() { return this.svc.findAll(); }

  @Get(':id') @Roles('OWNER', 'ADMIN')
  findOne(@Param('id') id: string) { return this.svc.findOne(id); }

  @Post() @Roles('OWNER', 'ADMIN')
  create(@Body() d: any) { return this.svc.create(d); }

  @Patch(':id') @Roles('OWNER', 'ADMIN')
  update(@Param('id') id: string, @Body() d: any) { return this.svc.update(id, d); }

  @Delete(':id') @Roles('OWNER', 'ADMIN')
  delete(@Param('id') id: string) { return this.svc.delete(id); }

  @Post(':id/publish') @Roles('OWNER', 'ADMIN')
  publish(@Param('id') id: string) { return this.svc.publish(id); }

  @Post(':id/clone') @Roles('OWNER', 'ADMIN')
  clone(@Param('id') id: string, @Body() d: { newKey: string; newName: string }) { return this.svc.clone(id, d.newKey, d.newName); }

  // === APPLY TO CLIENT ===
  @Post(':id/apply') @Roles('OWNER', 'ADMIN')
  apply(@Param('id') id: string, @Body() d: { clientKey?: string }, @Req() req) {
    return this.svc.apply(id, d.clientKey || 'default', req.user?.sub);
  }

  // === DRY RUN ===
  @Post(':id/dry-run') @Roles('OWNER', 'ADMIN')
  dryRun(@Param('id') id: string, @Body() d: { clientKey?: string }) {
    return this.svc.dryRun(id, d.clientKey || 'default');
  }

  // === UPGRADE ===
  @Post(':id/upgrade') @Roles('OWNER', 'ADMIN')
  upgrade(@Param('id') id: string, @Body() d: { clientKey?: string }, @Req() req) {
    return this.svc.upgrade(id, d.clientKey || 'default', req.user?.sub);
  }

  // === INSTALLATIONS ===
  @Get('installations/all') @Roles('OWNER', 'ADMIN')
  getInstallations() { return this.svc.getInstallations(); }

  // === CLIENT-SAFE ROUTE — any authenticated user can read their own config ===
  @Get('client/current')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT')
  getClientTemplate(@Query('clientKey') clientKey?: string) {
    return this.svc.getClientTemplate(clientKey || 'default');
  }
}
