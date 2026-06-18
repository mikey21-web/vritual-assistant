import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { NurtureSequencesService } from './nurture-sequences.service';
import { CreateNurtureSequenceDto, UpdateNurtureSequenceDto, CreateNurtureStepDto } from './dto/nurture-sequence.dto';
import { PaginationDto } from '../shared/dto/pagination.dto';
import { UpdateNurtureStepDto } from './dto/update-nurture-step.dto';

@ApiTags('Nurture Sequences')
@Controller('nurture-sequences')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class NurtureSequencesController {
  constructor(private service: NurtureSequencesService) {}

  @Get() @Roles('OWNER', 'ADMIN', 'MANAGER', 'VIEWER') findAll(@Query() q: PaginationDto) { return this.service.findAll(q); }
  @Post() @Roles('OWNER', 'ADMIN', 'MANAGER') create(@Body() d: CreateNurtureSequenceDto) { return this.service.create(d); }
  @Get(':id') @Roles('OWNER', 'ADMIN', 'MANAGER', 'VIEWER') findOne(@Param('id') id: string) { return this.service.findOne(id); }
  @Patch(':id') @Roles('OWNER', 'ADMIN', 'MANAGER') update(@Param('id') id: string, @Body() d: UpdateNurtureSequenceDto) { return this.service.update(id, d); }
  @Post(':id/steps') @Roles('OWNER', 'ADMIN', 'MANAGER') addStep(@Param('id') id: string, @Body() d: CreateNurtureStepDto) { return this.service.addStep(id, d); }
  @Patch(':id/steps/:stepId') @Roles('OWNER', 'ADMIN', 'MANAGER') updateStep(@Param('id') id: string, @Param('stepId') stepId: string, @Body() d: UpdateNurtureStepDto) { return this.service.updateStep(id, stepId, d); }
  @Delete(':id/steps/:stepId') @Roles('OWNER', 'ADMIN', 'MANAGER') deleteStep(@Param('id') id: string, @Param('stepId') stepId: string) { return this.service.deleteStep(id, stepId); }
}
