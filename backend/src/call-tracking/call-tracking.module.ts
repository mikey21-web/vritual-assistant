import { Module } from '@nestjs/common';
import { CallTrackingService } from './call-tracking.service';
import { CallTrackingController } from './call-tracking.controller';
import { DeviceAuthGuard } from './device-auth.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { ContactsModule } from '../contacts/contacts.module';
import { LeadsModule } from '../leads/leads.module';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [PrismaModule, ContactsModule, LeadsModule, RealtimeModule],
  controllers: [CallTrackingController],
  providers: [CallTrackingService, DeviceAuthGuard],
  exports: [CallTrackingService],
})
export class CallTrackingModule {}
