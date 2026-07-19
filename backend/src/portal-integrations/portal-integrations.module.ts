import { Module } from '@nestjs/common';
import { PortalIntegrationsController } from './portal-integrations.controller';
import { PortalIntegrationsService } from './portal-integrations.service';
import { ContactsModule } from '../contacts/contacts.module';
import { LeadsModule } from '../leads/leads.module';
import { ConversationsModule } from '../conversations/conversations.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PortalHealthService } from './portal-health.service';
import { PortalHealthController } from './portal-health.controller';

@Module({
  imports: [PrismaModule, ContactsModule, LeadsModule, ConversationsModule],
  controllers: [PortalIntegrationsController, PortalHealthController],
  providers: [PortalIntegrationsService, PortalHealthService],
})
export class PortalIntegrationsModule {}
