import { Controller, Get, Post, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { OffersService } from './offers.service';
import { CreateOfferDto } from './dto/create-offer.dto';
import { OfferDecision } from '@prisma/client';

@ApiTags('Offers')
@Controller('offers')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class OffersController {
  constructor(private service: OffersService) {}

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
  create(@Body() dto: CreateOfferDto, @Req() req: any) {
    return this.service.request(req.user.tenantId, {
      costSheetId: dto.costSheetId,
      discountPaise: dto.discountPaise,
      discountPercent: dto.discountPercent,
      reason: dto.reason,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      requestedById: req.user.id,
    });
  }

  @Post(':id/approve')
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  approve(@Param('id') id: string, @Body('reason') reason: string, @Req() req: any) {
    return this.service.decide(req.user.tenantId, id, OfferDecision.APPROVED, reason, req.user.id);
  }

  @Post(':id/reject')
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  reject(@Param('id') id: string, @Body('reason') reason: string, @Req() req: any) {
    return this.service.decide(req.user.tenantId, id, OfferDecision.REJECTED, reason, req.user.id);
  }
}
