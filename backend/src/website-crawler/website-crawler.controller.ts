import { Controller, Post, Body, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { WebsiteCrawlerService } from './website-crawler.service';

@ApiTags('Website Crawler')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('website-crawler')
export class WebsiteCrawlerController {
  constructor(private svc: WebsiteCrawlerService) {}

  @Post('crawl')
  @Roles('OWNER', 'ADMIN')
  async crawl(@Req() req, @Body('url') url: string) {
    return this.svc.crawl(req.user.sub, url);
  }
}
