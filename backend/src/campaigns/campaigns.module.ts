import { Module } from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { CampaignsController } from './campaigns.controller';
import { CampaignDispatcherService } from './campaign-dispatcher.service';
import { ConversationsModule } from '../conversations/conversations.module';

@Module({
  imports: [ConversationsModule],
  controllers: [CampaignsController],
  providers: [CampaignsService, CampaignDispatcherService],
  exports: [CampaignsService, CampaignDispatcherService],
})
export class CampaignsModule {}
