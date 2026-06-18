import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { EventsService } from './events.service';

@ApiTags('Events')
@Controller('events')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class EventsController {
  constructor(private svc: EventsService) {}

  @Get('leads/:leadId') @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'SUPPORT_AGENT', 'VIEWER')
  getByLead(@Param('leadId') leadId: string) { return this.svc.findByLead(leadId); }

  @Get('contacts/:contactId') @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'SUPPORT_AGENT', 'VIEWER')
  getByContact(@Param('contactId') contactId: string) { return this.svc.findByEntity('contact', contactId); }

  @Get('type/:type') @Roles('OWNER', 'ADMIN', 'MANAGER')
  getByType(@Param('type') type: string, @Query('limit') limit?: string) { return this.svc.findByType(type, limit ? +limit : 50); }
}
