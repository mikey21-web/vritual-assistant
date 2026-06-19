import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CampaignsService } from './campaigns.service';
import { CreateCampaignDto, UpdateCampaignDto } from './dto/campaign.dto';
import { PaginationDto } from '../shared/dto/pagination.dto';

@ApiTags('Campaigns')
@Controller('campaigns')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class CampaignsController {
  constructor(private service: CampaignsService) {}

  @Get() @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT') findAll(@Query() q: PaginationDto) { return this.service.findAll(q); }
  @Post() @Roles('OWNER', 'ADMIN', 'MANAGER') create(@Body() d: CreateCampaignDto, @Req() req) { return this.service.create({...d, creatorId: req.user.sub}, req.user.sub); }
  @Get(':id') @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'VIEWER') findOne(@Param('id') id: string) { return this.service.findOne(id); }
  @Patch(':id') @Roles('OWNER', 'ADMIN', 'MANAGER') update(@Param('id') id: string, @Body() d: UpdateCampaignDto, @Req() req) { return this.service.update(id, d, req.user.sub); }
  @Post(':id/pause') @Roles('OWNER', 'ADMIN', 'MANAGER') pause(@Param('id') id: string, @Req() req) { return this.service.pause(id, req.user.sub); }
  @Post(':id/activate') @Roles('OWNER', 'ADMIN', 'MANAGER') activate(@Param('id') id: string, @Req() req) { return this.service.activate(id, req.user.sub); }
  @Post(':id/duplicate') @Roles('OWNER', 'ADMIN', 'MANAGER') duplicate(@Param('id') id: string, @Req() req) { return this.service.duplicate(id, req.user.sub); }
  @Get(':id/performance') @Roles('OWNER', 'ADMIN', 'MANAGER', 'VIEWER') performance(@Param('id') id: string) { return this.service.performance(id); }
}
