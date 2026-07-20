import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { SiteVisitsService } from './site-visits.service';
import { CreateSiteVisitDto } from './dto/create-site-visit.dto';
import {
  UpdateSiteVisitDto,
  RescheduleSiteVisitDto,
  CompleteSiteVisitOutcomeDto,
  NoShowSiteVisitDto,
} from './dto/update-site-visit.dto';

@ApiTags('Site Visits')
@Controller('site-visits')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class SiteVisitsController {
  constructor(private service: SiteVisitsService) {}

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
  create(@Body() dto: CreateSiteVisitDto, @Req() req: any) {
    return this.service.create({
      tenantId: req.user.tenantId,
      createdById: req.user.id,
      leadId: dto.leadId,
      projectId: dto.projectId,
      unitId: dto.unitId,
      assignedAgentId: dto.assignedAgentId,
      startAt: new Date(dto.startAt),
      endAt: dto.endAt ? new Date(dto.endAt) : undefined,
      meetingPoint: dto.meetingPoint,
      mapsUrl: dto.mapsUrl,
      attendeeCount: dto.attendeeCount,
      transportNote: dto.transportNote,
      language: dto.language,
      confirmationChannel: dto.confirmationChannel,
    });
  }

  @Patch(':id')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT')
  update(@Param('id') id: string, @Body() dto: UpdateSiteVisitDto, @Req() req: any) {
    const data: any = { ...dto };
    if (dto.startAt) data.startAt = new Date(dto.startAt);
    if (dto.endAt) data.endAt = new Date(dto.endAt);
    return this.service.update(req.user.tenantId, id, data, req.user.id);
  }

  @Post(':id/confirm')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT')
  confirm(@Param('id') id: string, @Req() req: any) {
    return this.service.confirm(req.user.tenantId, id, req.user.id);
  }

  @Post(':id/check-in')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT')
  checkIn(@Param('id') id: string, @Body('lat') lat: number | undefined, @Body('lng') lng: number | undefined, @Req() req: any) {
    return this.service.checkIn(req.user.tenantId, id, req.user.id, lat, lng);
  }

  @Post(':id/check-out')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT')
  checkOut(@Param('id') id: string, @Req() req: any) {
    return this.service.checkOut(req.user.tenantId, id, req.user.id);
  }

  @Post(':id/complete')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT')
  complete(@Param('id') id: string, @Body() dto: CompleteSiteVisitOutcomeDto, @Req() req: any) {
    return this.service.complete(req.user.tenantId, id, {
      outcome: dto.outcome,
      nextActionAt: dto.nextActionAt ? new Date(dto.nextActionAt) : undefined,
    }, req.user.id);
  }

  @Post(':id/no-show')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT')
  noShow(@Param('id') id: string, @Body() dto: NoShowSiteVisitDto, @Req() req: any) {
    return this.service.markNoShow(req.user.tenantId, id, dto.noShowReason, req.user.id);
  }

  @Post(':id/reschedule')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT')
  reschedule(@Param('id') id: string, @Body() dto: RescheduleSiteVisitDto, @Req() req: any) {
    return this.service.reschedule(
      req.user.tenantId,
      id,
      new Date(dto.startAt),
      dto.endAt ? new Date(dto.endAt) : undefined,
      dto.reason,
      req.user.id,
    );
  }

  @Post(':id/cancel')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT')
  cancel(@Param('id') id: string, @Body('reason') reason: string, @Req() req: any) {
    return this.service.cancel(req.user.tenantId, id, reason, req.user.id);
  }
}
