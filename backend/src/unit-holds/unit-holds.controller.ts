import { Controller, Get, Post, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UnitHoldsService } from './unit-holds.service';
import { CreateUnitHoldDto } from './dto/create-unit-hold.dto';

@ApiTags('Unit Holds')
@Controller('unit-holds')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class UnitHoldsController {
  constructor(private service: UnitHoldsService) {}

  @Get()
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'VIEWER', 'SALES_AGENT')
  findAll(@Query() q: any, @Req() req: any) {
    return this.service.findAll(req.user.tenantId, q);
  }

  @Get(':id')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'VIEWER', 'SALES_AGENT')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.service.findOne(req.user.tenantId, id);
  }

  @Post()
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT')
  create(@Body() dto: CreateUnitHoldDto, @Req() req: any) {
    return this.service.requestHold({
      tenantId: req.user.tenantId,
      unitId: dto.unitId,
      leadId: dto.leadId,
      requestedById: req.user.id,
      holdHours: dto.holdHours,
    });
  }

  @Post(':id/extend')
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  extend(@Param('id') id: string, @Body('expiresAt') expiresAt: string, @Req() req: any) {
    return this.service.extend(req.user.tenantId, id, new Date(expiresAt), req.user.id);
  }

  @Post(':id/release')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT')
  release(@Param('id') id: string, @Body('reason') reason: string, @Req() req: any) {
    return this.service.release(req.user.tenantId, id, reason, req.user.id);
  }
}
