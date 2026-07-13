import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { CallTrackingService } from './call-tracking.service';
import { CallTrackingController } from './call-tracking.controller';
import { CallSummaryService } from './call-summary.service';
import { DeviceAuthGuard } from './device-auth.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { ContactsModule } from '../contacts/contacts.module';
import { LeadsModule } from '../leads/leads.module';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [PrismaModule, ContactsModule, LeadsModule, RealtimeModule, HttpModule],
  controllers: [CallTrackingController],
  providers: [CallTrackingService, CallSummaryService, DeviceAuthGuard],
  exports: [CallTrackingService, CallSummaryService],
})
export class CallTrackingModule {}
