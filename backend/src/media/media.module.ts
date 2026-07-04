import { Module } from '@nestjs/common';
import { MediaService } from './media.service';
import { MediaController, LeadMediaController, CampaignMediaController, TemplateMediaController } from './media.controller';
import { DigitalDownloadService } from './digital-download.service';
import { DigitalDownloadController } from './digital-download.controller';

@Module({
  controllers: [MediaController, LeadMediaController, CampaignMediaController, TemplateMediaController, DigitalDownloadController],
  providers: [MediaService, DigitalDownloadService],
  exports: [MediaService, DigitalDownloadService],
})
export class MediaModule {}
