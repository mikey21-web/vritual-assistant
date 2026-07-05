import { Controller, Post, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AgentService } from './agent.service';
import { UpdateAgentConfigDto } from './dto/update-agent-config.dto';

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

  @Get('status')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT')
  getStatus() {
    return this.agent.getStatus();
  }

  @Get('stats')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT')
  getStats() {
    return this.agent.getStats();
  }

  @Post('test')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT')
  testAgent(@Body() d: { message: string; channel?: string }) {
    return this.agent.testAgent(d.message, d.channel || 'chatbot');
  }

  @Patch('config')
  @Roles('OWNER', 'ADMIN')
  async updateConfig(@Body() d: UpdateAgentConfigDto) {
    return this.agent.updateConfig(d);
  }
}
