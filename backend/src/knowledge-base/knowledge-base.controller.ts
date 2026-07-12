import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { KnowledgeBaseService } from './knowledge-base.service';
import { CreateKnowledgeBaseEntryDto, UpdateKnowledgeBaseEntryDto } from './dto/knowledge-base.dto';

@ApiTags('Knowledge Base')
@Controller('knowledge-base')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class KnowledgeBaseController {
  constructor(private service: KnowledgeBaseService) {}

  @Get() @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'VIEWER') findAll(@Query() q: any) { return this.service.findAll(q); }

  // Read by the agent-service (service-key auth, role SALES_AGENT) to answer lead questions.
  @Get('search') @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'VIEWER') search(@Query('q') q: string) { return this.service.search(q); }

  @Get(':id') @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'VIEWER') findOne(@Param('id') id: string) { return this.service.findOne(id); }
  @Post() @Roles('OWNER', 'ADMIN', 'MANAGER') create(@Body() d: CreateKnowledgeBaseEntryDto, @Req() req) { return this.service.create(d, req.user.sub); }
  @Patch(':id') @Roles('OWNER', 'ADMIN', 'MANAGER') update(@Param('id') id: string, @Body() d: UpdateKnowledgeBaseEntryDto, @Req() req) { return this.service.update(id, d, req.user.sub); }
  @Delete(':id') @Roles('OWNER', 'ADMIN', 'MANAGER') remove(@Param('id') id: string, @Req() req) { return this.service.remove(id, req.user.sub); }
}
