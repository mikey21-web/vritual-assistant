import { Module } from '@nestjs/common';
import { ResaleListingsService } from './resale-listings.service';
import { ResaleListingsController } from './resale-listings.controller';

@Module({
  controllers: [ResaleListingsController],
  providers: [ResaleListingsService],
  exports: [ResaleListingsService],
})
export class ResaleListingsModule {}
