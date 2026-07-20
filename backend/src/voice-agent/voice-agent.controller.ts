import { Controller, Post, Get, Param, Req, UseGuards, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { VoiceAgentService } from './voice-agent.service';

@Controller('voice-agent')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VoiceAgentController {
  constructor(private service: VoiceAgentService) {}

  @Post('call/:leadId')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT')
  async callLead(@Param('leadId') leadId: string, @Req() req: any, @Query('lang') lang?: string) {
    return this.service.callLead(leadId, req.user.sub, lang || 'en');
  }

  @Get('history')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT')
  async history(@Req() req: any, @Query('limit') limit?: string) {
    return this.service.getCallHistory(req.user.tenantId, limit ? parseInt(limit) : 20);
  }
}
