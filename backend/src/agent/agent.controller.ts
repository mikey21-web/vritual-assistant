import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AgentService } from './agent.service';

@ApiTags('Agent')
@Controller('agent')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AgentController {
  constructor(private agent: AgentService) {}

  @Post('run-summary')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT')
  recordRunSummary(@Body() d: { runId: string; leadId: string; actions: any[]; model: string; startedAt: string; finishedAt: string }) {
    return this.agent.recordRunSummary(d);
  }
}
