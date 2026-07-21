import { Module, forwardRef } from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { ConversationsController } from './conversations.controller';
import { MessagePolicyService } from './message-policy.service';
import { EmailSyncService } from './email-sync.service';
import { SharedModule } from '../shared/shared.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { LeadsModule } from '../leads/leads.module';

@Module({
  imports: [SharedModule, RealtimeModule, forwardRef(() => LeadsModule)],
  controllers: [ConversationsController],
  providers: [ConversationsService, MessagePolicyService, EmailSyncService],
  exports: [ConversationsService, MessagePolicyService],
})
export class ConversationsModule {}
