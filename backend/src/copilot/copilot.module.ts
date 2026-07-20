import { Module } from '@nestjs/common';
import { CopilotController } from './copilot.controller';
import { CopilotService } from './copilot.service';
import { PrismaModule } from '../prisma/prisma.module';
import { LeadsModule } from '../leads/leads.module';
import { TasksModule } from '../tasks/tasks.module';
import { TicketsModule } from '../tickets/tickets.module';
import { CampaignsModule } from '../campaigns/campaigns.module';
import { ConversationsModule } from '../conversations/conversations.module';
import { ReportsModule } from '../reports/reports.module';
import { CustomFieldsModule } from '../custom-fields/custom-fields.module';
import { TelephonyModule } from '../telephony/telephony.module';
import { SharedModule } from '../shared/shared.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { ContactsModule } from '../contacts/contacts.module';
import { MikeyModule } from '../mikey/mikey.module';
import { CallTrackingModule } from '../call-tracking/call-tracking.module';
import { ApprovalsModule } from '../approvals/approvals.module';

@Module({
  imports: [PrismaModule, LeadsModule, TasksModule, TicketsModule, CampaignsModule, ConversationsModule, ReportsModule, CustomFieldsModule, TelephonyModule, SharedModule, AnalyticsModule, ContactsModule, MikeyModule, CallTrackingModule, ApprovalsModule],
  controllers: [CopilotController],
  providers: [CopilotService],
})
export class CopilotModule {}

