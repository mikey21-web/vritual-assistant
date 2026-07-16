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

  @Get(':id') @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'VIEWER')
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Get(':id/performance') @Roles('OWNER', 'ADMIN', 'MANAGER', 'VIEWER')
  performance(@Param('id') id: string) { return this.service.performance(id); }

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
}
