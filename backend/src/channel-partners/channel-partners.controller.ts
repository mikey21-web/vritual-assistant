import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ChannelPartnersService } from './channel-partners.service';
import { CreateChannelPartnerDto, UpdateChannelPartnerDto, AllocateLeadDto } from './dto/channel-partner.dto';

@ApiTags('Channel Partners')
@Controller('channel-partners')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ChannelPartnersController {
  constructor(private service: ChannelPartnersService) {}

  @Get() @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'VIEWER')
  findAll(@Query() q: any) { return this.service.findAll(q); }

  @Get('expiry-alerts') @Roles('OWNER', 'ADMIN', 'MANAGER')
  expiryAlerts(@Query('days') days: string, @Req() req: any) {
    return this.service.expiryAlerts(req.user?.tenantId, days ? +days : undefined);
  }

  @Get(':id') @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'VIEWER')
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Get(':id/performance') @Roles('OWNER', 'ADMIN', 'MANAGER', 'VIEWER')
  performance(@Param('id') id: string) { return this.service.performance(id); }

  @Patch(':id/onboarding-status') @Roles('OWNER', 'ADMIN', 'MANAGER')
  updateOnboardingStatus(@Param('id') id: string, @Body('onboardingStatus') onboardingStatus: string) {
    return this.service.updateOnboardingStatus(id, onboardingStatus);
  }

  @Post(':id/training-complete') @Roles('OWNER', 'ADMIN', 'MANAGER')
  markTrainingComplete(@Param('id') id: string) { return this.service.markTrainingComplete(id); }

  @Post() @Roles('OWNER', 'ADMIN', 'MANAGER')
  create(@Body() dto: CreateChannelPartnerDto, @Req() req: any) {
    return this.service.create({ ...dto, tenantId: req.user?.tenantId });
  }

  @Patch(':id') @Roles('OWNER', 'ADMIN', 'MANAGER')
  update(@Param('id') id: string, @Body() dto: UpdateChannelPartnerDto) {
    return this.service.update(id, dto);
  }

  @Post('allocate') @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT')
  allocate(@Body() dto: AllocateLeadDto) {
    return this.service.allocateLead(dto.leadId, dto.partnerId ?? null);
  }

  @Delete(':id') @Roles('OWNER', 'ADMIN')
  remove(@Param('id') id: string) { return this.service.remove(id); }

  @Get('inventory/available') @Roles('CHANNEL_PARTNER', 'OWNER', 'ADMIN', 'MANAGER')
  availableInventory(@Query() q: any, @Req() req: any) {
    return this.service.getAvailableInventory(req.user?.tenantId, q);
  }

  @Post(':id/lock-buyer') @Roles('OWNER', 'ADMIN', 'MANAGER', 'CHANNEL_PARTNER')
  lockBuyer(@Param('id') id: string, @Body('phone') phone: string) {
    return this.service.lockBuyerToPartner(id, phone);
  }

  @Get('check-buyer-lock') @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'CHANNEL_PARTNER')
  checkBuyerLock(@Query('phone') phone: string) {
    return this.service.checkBuyerLock(phone);
  }
}
