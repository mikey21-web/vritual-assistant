import { Controller, Get, Post, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ConversationsService } from './conversations.service';
import { CreateConversationMessageDto, ConversationQueryDto } from './dto/conversation.dto';
import { PaginationDto } from '../shared/dto/pagination.dto';

@ApiTags('Conversations')
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ConversationsController {
  constructor(private service: ConversationsService) {}

  @Get('conversations') @Roles('OWNER', 'ADMIN', 'MANAGER', 'SUPPORT_AGENT') findAll(@Query() q: ConversationQueryDto & PaginationDto) { return this.service.findAll(q); }
  @Get('leads/:id/conversations') @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'SUPPORT_AGENT') getByLead(@Param('id') id: string) { return this.service.getByLead(id); }
  @Post('conversations/messages') @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'SUPPORT_AGENT') create(@Body() d: CreateConversationMessageDto, @Req() req) { return this.service.create(d, req.user.sub); }
}
