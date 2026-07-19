import { Module } from '@nestjs/common';
import { MarketingJourneysService } from './marketing-journeys.service';
import { MarketingJourneysController } from './marketing-journeys.controller';

@Module({
  controllers: [MarketingJourneysController],
  providers: [MarketingJourneysService],
  exports: [MarketingJourneysService],
})
export class MarketingJourneysModule {}
