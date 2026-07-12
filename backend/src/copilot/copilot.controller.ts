import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CopilotClientService } from './copilot-client.service';
import { CopilotChatDto } from './dto/copilot-chat.dto';

@ApiTags('Copilot')
@Controller('copilot')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class CopilotController {
  constructor(private client: CopilotClientService) {}

  // Owner/team-facing assistant over the whole business, distinct from the
  // lead-facing agent — deliberately scoped to privileged roles since it can
  // read aggregate data and send messages/create tasks on the team's behalf.
  @Post('chat') @Roles('OWNER', 'ADMIN', 'MANAGER')
  chat(@Body() d: CopilotChatDto) { return this.client.chat(d.messages, d.leadId); }
}
