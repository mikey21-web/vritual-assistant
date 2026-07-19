import { Module } from '@nestjs/common';
import { RevenueShareService } from './revenue-share.service';
import { RevenueShareController } from './revenue-share.controller';

@Module({
  controllers: [RevenueShareController],
  providers: [RevenueShareService],
  exports: [RevenueShareService],
})
export class RevenueShareModule {}
