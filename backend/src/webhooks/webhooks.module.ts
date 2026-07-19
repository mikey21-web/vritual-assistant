import { Module } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { WebhooksController } from './webhooks.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ContactsModule } from '../contacts/contacts.module';
import { LeadsModule } from '../leads/leads.module';
import { ConversationsModule } from '../conversations/conversations.module';
import { AgentModule } from '../agent/agent.module';
import { DocumentsModule } from '../documents/documents.module';

@Module({
  imports: [PrismaModule, ContactsModule, LeadsModule, ConversationsModule, AgentModule, DocumentsModule],
  controllers: [WebhooksController],
  providers: [WebhooksService],
  exports: [WebhooksService],
})
export class WebhooksModule {}
