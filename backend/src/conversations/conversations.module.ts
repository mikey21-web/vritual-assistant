import { Module } from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { ConversationsController } from './conversations.controller';
import { MessagePolicyService } from './message-policy.service';

@Module({
  controllers: [ConversationsController],
  providers: [ConversationsService, MessagePolicyService],
  exports: [ConversationsService, MessagePolicyService],
})
export class ConversationsModule {}
