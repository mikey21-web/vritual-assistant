import { Controller, Get, Post, Patch, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { PhysicalDocumentsService } from './physical-documents.service';

@ApiTags('Physical Documents')
@Controller('physical-documents')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class PhysicalDocumentsController {
  constructor(private service: PhysicalDocumentsService) {}

  @Post()
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  create(@Body() body: any, @Req() req: any) {
    return this.service.createRecord(req.user.tenantId, { ...body, createdById: req.user.id });
  }

  @Get()
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'VIEWER')
  findAll(@Req() req: any, @Query() query: any) {
    return this.service.findAll(req.user.tenantId, {
      leadId: query.leadId, bookingId: query.bookingId,
      returned: query.returned === 'true' ? true : query.returned === 'false' ? false : undefined,
    });
  }

  @Get(':id')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'VIEWER')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.service.findOne(req.user.tenantId, id);
  }

  @Post(':id/checkout')
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  checkout(@Param('id') id: string, @Body() body: { dueBackAt?: string }, @Req() req: any) {
    return this.service.checkOut(req.user.tenantId, id, req.user.id, body.dueBackAt);
  }

  @Post(':id/checkin')
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  checkin(@Param('id') id: string, @Body() body: { scanLinkMediaFileId?: string }, @Req() req: any) {
    return this.service.checkIn(req.user.tenantId, id, body.scanLinkMediaFileId);
  }

  @Patch(':id/location')
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  updateLocation(@Param('id') id: string, @Body() body: { location: string }, @Req() req: any) {
    return this.service.updateLocation(req.user.tenantId, id, body.location);
  }

  @Get('location-map/all')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'VIEWER')
  locationMap(@Req() req: any) {
    return this.service.getLocationMap(req.user.tenantId);
  }
}
