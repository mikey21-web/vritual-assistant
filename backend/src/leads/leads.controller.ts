import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { LeadsService } from './leads.service';
import { CreateLeadDto, UpdateLeadDto, AssignLeadDto, LeadQueryDto, CreateManualLeadDto } from './dto/lead.dto';
import { PaginationDto } from '../shared/dto/pagination.dto';
import { MoveStageDto } from '../advanced-features/dto/advanced-features.dto';

@ApiTags('Leads')
@Controller('leads')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class LeadsController {
  constructor(private service: LeadsService) {}

  @Get()
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'SUPPORT_AGENT', 'VIEWER')
  @ApiQuery({ name: 'status', required: false }) @ApiQuery({ name: 'segment', required: false }) @ApiQuery({ name: 'source', required: false }) @ApiQuery({ name: 'campaignId', required: false }) @ApiQuery({ name: 'assignedAgentId', required: false }) @ApiQuery({ name: 'search', required: false })
  findAll(@Query() q: LeadQueryDto & PaginationDto) { return this.service.findAll(q); }

  @Post()
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT')
  create(@Body() d: CreateLeadDto, @Req() req) { return this.service.create(d, req.user.sub); }

  @Post('manual')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT')
  @ApiOperation({ summary: "Manually add a lead that came from outside Mikey's coverage (walk-in, referral, offline)" })
  createManual(@Body() d: CreateManualLeadDto, @Req() req) { return this.service.createManual(d, req.user.sub, req); }

  @Get(':id')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'SUPPORT_AGENT', 'VIEWER')
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Get(':id/brief')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT')
  @ApiOperation({ summary: 'Pre-visit brief — buyer profile, preferences, matching units, objections, notes' })
  getBrief(@Param('id') id: string) { return this.service.getBrief(id); }

  @Get('worklist/mine')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT')
  @ApiOperation({ summary: "The current agent's day: hot leads, today's visits, overdue follow-ups" })
  getMyWorklist(@Req() req) { return this.service.getAgentWorklist(req.user.sub); }

  @Patch(':id')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT')
  update(@Param('id') id: string, @Body() d: UpdateLeadDto, @Req() req) { return this.service.update(id, d, req.user.sub); }

  @Post(':id/score')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT')
  score(@Param('id') id: string, @Req() req) { return this.service.score(id, req.user.sub); }

  @Post(':id/assign')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT')
  assign(@Param('id') id: string, @Body() d: AssignLeadDto, @Req() req) { return this.service.assign(id, d.agentId, req.user.sub); }

  @Post(':id/mark-spam')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT')
  markSpam(@Param('id') id: string, @Req() req) { return this.service.markSpam(id, req.user.sub); }

  @Patch(':id/move-stage')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT')
  moveStage(@Param('id') id: string, @Body() d: MoveStageDto, @Req() req) { return this.service.update(id, { status: d.status }, req.user.sub); }
}
