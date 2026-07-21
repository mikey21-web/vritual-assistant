import { Module, forwardRef } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { LeadsController } from './leads.controller';
import { LeadContextService } from './lead-context.service';
import { AdvancedFeaturesModule } from '../advanced-features/advanced-features.module';
import { ContactsModule } from '../contacts/contacts.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { VoiceAgentModule } from '../voice-agent/voice-agent.module';
import { TimelineModule } from '../timeline/timeline.module';

@Module({
  imports: [forwardRef(() => AdvancedFeaturesModule), ContactsModule, RealtimeModule, VoiceAgentModule, TimelineModule],
  controllers: [LeadsController],
  providers: [LeadsService, LeadContextService],
  exports: [LeadsService, LeadContextService],
})
export class LeadsModule {}
