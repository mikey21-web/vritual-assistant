import { Module } from '@nestjs/common';
import { AdvancedMarketingService } from './advanced-marketing.service';
import { AdvancedMarketingController } from './advanced-marketing.controller';

@Module({
  controllers: [AdvancedMarketingController],
  providers: [AdvancedMarketingService],
  exports: [AdvancedMarketingService],
})
export class AdvancedMarketingModule {}
