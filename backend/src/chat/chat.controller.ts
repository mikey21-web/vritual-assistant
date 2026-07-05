import { Controller, Post, Body, Headers, Req, RawBodyRequest, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ChatService } from './chat.service';
import { Public } from '../auth/public.decorator';

export class ChatSendDto {
  sessionId?: string;
  name?: string;
  email?: string;
  phone?: string;
  message: string;
}

@ApiTags('Chat')
@Controller('chat')
@Throttle({ default: { limit: 30, ttl: 60000 } })
export class ChatController {
  private readonly logger = new Logger(ChatController.name);

  constructor(private service: ChatService) {}

  @Public()
  @Post('send')
  @ApiOperation({ summary: 'Send a chat message and get AI response (for embedded widget)' })
  async sendMessage(
    @Body() d: ChatSendDto,
    @Headers('x-api-key') apiKey?: string,
    @Req() req?: RawBodyRequest<any>,
  ) {
    return this.service.handleChatMessage(d, req);
  }
}
