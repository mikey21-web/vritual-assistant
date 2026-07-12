import { Module } from '@nestjs/common';
import { LeadReplyWatcherService } from './lead-reply-watcher.service';
import { PrismaModule } from '../prisma/prisma.module';
import { LeadsModule } from '../leads/leads.module';

@Module({
  imports: [PrismaModule, LeadsModule],
  providers: [LeadReplyWatcherService],
})
export class LeadIntelligenceModule {}
