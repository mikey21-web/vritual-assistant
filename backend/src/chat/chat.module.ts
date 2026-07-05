import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ScraperController } from './scraper.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ContactsModule } from '../contacts/contacts.module';
import { LeadsModule } from '../leads/leads.module';
import { ConversationsModule } from '../conversations/conversations.module';

@Module({
  imports: [HttpModule, PrismaModule, ContactsModule, LeadsModule, ConversationsModule],
  controllers: [ChatController, ScraperController],
  providers: [ChatService],
})
export class ChatModule {}
