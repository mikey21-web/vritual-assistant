import { Controller, Post, Get, Body, Param, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CopilotService } from './copilot.service';
import { ChatDto, ConfirmActionDto } from './dto/copilot.dto';

@ApiTags('Copilot')
@Controller('copilot')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class CopilotController {
  constructor(private service: CopilotService) {}

  @Post('chat')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'SUPPORT_AGENT', 'VIEWER')
  @ApiOperation({ summary: 'Send a chat message to the CRM copilot' })
  chat(@Body() dto: ChatDto, @Req() req) {
    return this.service.chat(req.user.sub, req.user.role, req.user.tenantId || 'default-tenant', dto.message, dto.conversationId);
  }

  @Post('confirm-action')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'SUPPORT_AGENT')
  @ApiOperation({ summary: 'Confirm a pending high-impact action' })
  confirmAction(@Body() dto: ConfirmActionDto, @Req() req) {
    return this.service.confirmAction(req.user.sub, req.user.role, dto.pendingActionId);
  }

  @Get('conversations')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'SUPPORT_AGENT', 'VIEWER')
  @ApiOperation({ summary: 'List copilot conversations for the current user' })
  getConversations(@Req() req) {
    return this.service.getConversations(req.user.sub);
  }

  @Get('conversations/:id')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'SUPPORT_AGENT', 'VIEWER')
  @ApiOperation({ summary: 'Get full copilot conversation history' })
  getConversation(@Param('id') id: string, @Req() req) {
    return this.service.getConversation(id, req.user.sub);
  }
}
