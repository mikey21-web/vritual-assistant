import { Module } from '@nestjs/common';
import { CollectionsService } from './collections.service';
import { CollectionsController } from './collections.controller';
import { InterestService } from './interest.service';
import { InterestController } from './interest.controller';

@Module({
  controllers: [CollectionsController, InterestController],
  providers: [CollectionsService, InterestService],
  exports: [CollectionsService, InterestService],
})
export class CollectionsModule {}
