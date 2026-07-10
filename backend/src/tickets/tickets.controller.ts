import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { TicketsService } from './tickets.service';
import { CreateTicketDto, UpdateTicketDto, CreateCommentDto, KnowledgeArticleDto, UpdateKnowledgeArticleDto } from './dto/ticket.dto';

@ApiTags('Tickets')
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class TicketsController {
  constructor(private service: TicketsService) {}

  @Get('tickets')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'SUPPORT_AGENT', 'VIEWER')
  findAll(@Query() q: any) { return this.service.findAll(q); }

  @Post('tickets')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SUPPORT_AGENT')
  create(@Body() d: CreateTicketDto, @Req() req) { return this.service.create(d, req.user.sub); }

  @Get('tickets/:id')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'SUPPORT_AGENT', 'VIEWER')
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Patch('tickets/:id')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SUPPORT_AGENT')
  update(@Param('id') id: string, @Body() d: UpdateTicketDto, @Req() req) { return this.service.update(id, d, req.user.sub); }

  @Post('tickets/:id/comments')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'SUPPORT_AGENT')
  addComment(@Param('id') id: string, @Body() d: CreateCommentDto, @Req() req) { return this.service.addComment(id, d, req.user.sub); }

  @Get('knowledge-articles')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'SUPPORT_AGENT', 'VIEWER')
  findArticles(@Query() q: any) { return this.service.findKnowledgeArticles(q); }

  @Post('knowledge-articles')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SUPPORT_AGENT')
  createArticle(@Body() d: KnowledgeArticleDto, @Req() req) { return this.service.createKnowledgeArticle(d, req.user.sub); }

  @Patch('knowledge-articles/:id')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SUPPORT_AGENT')
  updateArticle(@Param('id') id: string, @Body() d: UpdateKnowledgeArticleDto) { return this.service.updateKnowledgeArticle(id, d); }

  @Delete('knowledge-articles/:id')
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  deleteArticle(@Param('id') id: string) { return this.service.deleteKnowledgeArticle(id); }

  @Post('tickets/check-sla')
  @Roles('OWNER', 'ADMIN')
  checkSla() { return this.service.checkSlaBreaches(); }
}
