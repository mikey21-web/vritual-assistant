import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AutomationEventsService } from './automation-events.service';
import { CreateAutomationEventDto } from './dto/create-automation-event.dto';

@ApiTags('Automation Events')
@Controller('automation-events')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AutomationEventsController {
  constructor(private service: AutomationEventsService) {}
  @Get() @Roles('OWNER', 'ADMIN') findAll(@Query() q: Record<string, string>) { return this.service.findAll(q); }
  @Post() @Roles('OWNER', 'ADMIN') create(@Body() d: CreateAutomationEventDto) { return this.service.create(d); }
  @Post(':id/retry') @Roles('OWNER', 'ADMIN') retry(@Param('id') id: string) { return this.service.retry(id); }
}
