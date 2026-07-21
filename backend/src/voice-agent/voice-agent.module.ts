import { Module } from '@nestjs/common';
import { VoiceAgentService } from './voice-agent.service';
import { VoiceAgentController } from './voice-agent.controller';
import { LeadOrchestratorService } from './lead-orchestrator.service';
import { ConversationsModule } from '../conversations/conversations.module';

@Module({
  imports: [ConversationsModule],
  controllers: [VoiceAgentController],
  providers: [VoiceAgentService, LeadOrchestratorService],
  exports: [VoiceAgentService, LeadOrchestratorService],
})
export class VoiceAgentModule {}
