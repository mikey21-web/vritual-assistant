import { Module } from '@nestjs/common';
import { DocumentSearchService } from './document-search.service';
import { DocumentSearchController } from './document-search.controller';

@Module({
  controllers: [DocumentSearchController],
  providers: [DocumentSearchService],
  exports: [DocumentSearchService],
})
export class DocumentSearchModule {}
