import { Module } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { LeadsController } from './leads.controller';
import { AdvancedFeaturesModule } from '../advanced-features/advanced-features.module';
import { ContactsModule } from '../contacts/contacts.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { VoiceAgentModule } from '../voice-agent/voice-agent.module';

@Module({
  imports: [AdvancedFeaturesModule, ContactsModule, RealtimeModule, VoiceAgentModule],
  controllers: [LeadsController],
  providers: [LeadsService],
  exports: [LeadsService],
})
export class LeadsModule {}
