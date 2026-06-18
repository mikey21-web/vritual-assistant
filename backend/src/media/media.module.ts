import { Module } from '@nestjs/common';
import { MediaService } from './media.service';
import { MediaController, LeadMediaController, CampaignMediaController, TemplateMediaController } from './media.controller';

@Module({
  controllers: [MediaController, LeadMediaController, CampaignMediaController, TemplateMediaController],
  providers: [MediaService],
  exports: [MediaService],
})
export class MediaModule {}
