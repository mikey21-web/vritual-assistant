import { Controller, Get, Post, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { SalesTargetsService } from './sales-targets.service';

@ApiTags('Sales Targets')
@Controller('sales-targets')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class SalesTargetsController {
  constructor(private service: SalesTargetsService) {}

  @Post()
  @Roles('OWNER', 'ADMIN')
  create(@Body() body: any, @Req() req: any) {
    return this.service.createTarget(req.user.tenantId, { ...body, createdById: req.user.id });
  }

  @Get()
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT')
  list(@Req() req: any, @Query() q: any) {
    return this.service.listTargets(req.user.tenantId, q);
  }

  @Get(':id/progress')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT')
  progress(@Param('id') id: string, @Req() req: any) {
    return this.service.getProgress(req.user.tenantId, id);
  }
}
