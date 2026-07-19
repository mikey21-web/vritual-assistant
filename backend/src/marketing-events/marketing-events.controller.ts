import { Controller, Get, Post, Body, Param, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { MarketingEventsService } from './marketing-events.service';

@ApiTags('Marketing Events')
@Controller('marketing-events')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class MarketingEventsController {
  constructor(private service: MarketingEventsService) {}

  @Post()
  @Roles('OWNER', 'ADMIN')
  create(@Body() body: any, @Req() req: any) {
    return this.service.createEvent(req.user.tenantId, body, req.user.id);
  }

  @Get()
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'VIEWER')
  findAll(@Req() req: any) {
    return this.service.findAll(req.user.tenantId);
  }

  @Get(':id')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'VIEWER')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.service.findOne(req.user.tenantId, id);
  }

  @Post(':id/invite')
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  invite(@Param('id') id: string, @Body() body: { leadIds: string[] }, @Req() req: any) {
    return this.service.inviteLeads(req.user.tenantId, id, body.leadIds);
  }

  @Post(':id/checkin/generate')
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  generateCheckIn(@Param('id') id: string) {
    return this.service.generateCheckInToken(id);
  }

  @Post('checkin/:token')
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  checkIn(@Param('token') token: string) {
    return this.service.checkIn(token);
  }

  @Get(':id/report')
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  report(@Param('id') id: string, @Req() req: any) {
    return this.service.getEventReport(id, req.user.tenantId);
  }
}
