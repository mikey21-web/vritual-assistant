import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { WebsiteCrawlerController } from './website-crawler.controller';
import { WebsiteCrawlerService } from './website-crawler.service';
import { SharedModule } from '../shared/shared.module';

@Module({
  imports: [HttpModule, SharedModule],
  controllers: [WebsiteCrawlerController],
  providers: [WebsiteCrawlerService],
})
export class WebsiteCrawlerModule {}
