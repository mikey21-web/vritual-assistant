import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { EventsOpsService } from './events-ops.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import {
  CreateFunctionDto, CreateMoodboardIdeaDto, AssignTeamDto, AssignVendorDto,
  CreateEventFileDto, CreateEventExpenseDto, CreatePaymentMilestoneDto, CreateRunSheetItemDto,
} from './dto/sub-resources.dto';
import { PaginationDto } from '../shared/dto/pagination.dto';

const WRITE_ROLES = ['OWNER', 'ADMIN', 'MANAGER'] as const;
const READ_ROLES = ['OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'SUPPORT_AGENT'] as const;

@ApiTags('EventsOps')
@Controller('events-ops')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class EventsOpsController {
  constructor(private service: EventsOpsService) {}

  @Get() @Roles(...READ_ROLES) findAll(@Query() q: PaginationDto & { status?: string; type?: string; contactId?: string }) { return this.service.findAll(q); }
  @Post() @Roles(...WRITE_ROLES) create(@Body() d: CreateEventDto) { return this.service.create(d); }

  @Get('calendar') @Roles(...READ_ROLES) calendar(@Query('from') from: string, @Query('to') to: string) { return this.service.getCalendar(from, to); }

  @Get(':id') @Roles(...READ_ROLES) findOne(@Param('id') id: string) { return this.service.findOne(id); }
  @Patch(':id') @Roles(...WRITE_ROLES) update(@Param('id') id: string, @Body() d: UpdateEventDto) { return this.service.update(id, d); }

  @Get(':id/functions') @Roles(...READ_ROLES) listFunctions(@Param('id') id: string) { return this.service.listFunctions(id); }
  @Post(':id/functions') @Roles(...WRITE_ROLES) createFunction(@Param('id') id: string, @Body() d: CreateFunctionDto) { return this.service.createFunction(id, d); }

  @Get(':id/moodboard') @Roles(...READ_ROLES) listMoodboard(@Param('id') id: string) { return this.service.listMoodboard(id); }
  @Post(':id/moodboard') @Roles(...WRITE_ROLES) createMoodboardIdea(@Param('id') id: string, @Body() d: CreateMoodboardIdeaDto) { return this.service.createMoodboardIdea(id, d); }

  @Get(':id/team') @Roles(...READ_ROLES) listTeam(@Param('id') id: string) { return this.service.listTeam(id); }
  @Post(':id/team') @Roles(...WRITE_ROLES) assignTeamMember(@Param('id') id: string, @Body() d: AssignTeamDto) { return this.service.assignTeamMember(id, d); }

  @Get(':id/vendors') @Roles(...READ_ROLES) listVendors(@Param('id') id: string) { return this.service.listVendors(id); }
  @Post(':id/vendors') @Roles(...WRITE_ROLES) assignVendor(@Param('id') id: string, @Body() d: AssignVendorDto) { return this.service.assignVendor(id, d); }

  @Get(':id/files') @Roles(...READ_ROLES) listFiles(@Param('id') id: string, @Query('visibility') visibility?: string) { return this.service.listFiles(id, visibility); }
  @Post(':id/files') @Roles(...WRITE_ROLES) createFile(@Param('id') id: string, @Body() d: CreateEventFileDto) { return this.service.createFile(id, d); }

  @Get(':id/expenses') @Roles(...READ_ROLES) listExpenses(@Param('id') id: string) { return this.service.listExpenses(id); }
  @Post(':id/expenses') @Roles(...WRITE_ROLES) createExpense(@Param('id') id: string, @Body() d: CreateEventExpenseDto) { return this.service.createExpense(id, d); }

  @Get(':id/milestones') @Roles(...READ_ROLES) listMilestones(@Param('id') id: string) { return this.service.listMilestones(id); }
  @Post(':id/milestones') @Roles(...WRITE_ROLES) createMilestone(@Param('id') id: string, @Body() d: CreatePaymentMilestoneDto) { return this.service.createMilestone(id, d); }

  @Get(':id/runsheet') @Roles(...READ_ROLES) listRunSheet(@Param('id') id: string) { return this.service.listRunSheet(id); }
  @Post(':id/runsheet') @Roles(...WRITE_ROLES) createRunSheetItem(@Param('id') id: string, @Body() d: CreateRunSheetItemDto) { return this.service.createRunSheetItem(id, d); }

  @Get(':id/financials') @Roles(...READ_ROLES) financials(@Param('id') id: string) { return this.service.getFinancials(id); }
}
