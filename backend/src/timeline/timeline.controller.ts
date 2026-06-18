import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { TimelineService } from './timeline.service';

@ApiTags('Timeline')
@Controller('leads/:leadId/timeline')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class TimelineController {
  constructor(private svc: TimelineService) {}

  @Get() @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'SUPPORT_AGENT', 'VIEWER')
  getByLead(@Param('leadId') leadId: string) { return this.svc.getByLead(leadId); }
}
