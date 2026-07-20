import { Controller, Get, Post, Param, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { TimelineService } from './timeline.service';

@ApiTags('Timeline')
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class TimelineController {
  constructor(private svc: TimelineService) {}

  @Get('leads/:leadId/timeline') @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'SUPPORT_AGENT', 'VIEWER')
  getByLead(@Param('leadId') leadId: string) { return this.svc.getByLead(leadId); }

  @Post('timeline/discount-approved') @Roles('OWNER', 'ADMIN', 'MANAGER')
  discountApproved(@Body() body: { leadId: string; discountAmount: string }, @Req() req: any) {
    return this.svc.recordDiscountApproved(body.leadId, body.discountAmount, req.user?.id);
  }
}
