import { Module } from '@nestjs/common';
import { PhysicalDocumentsService } from './physical-documents.service';
import { PhysicalDocumentsController } from './physical-documents.controller';

@Module({
  controllers: [PhysicalDocumentsController],
  providers: [PhysicalDocumentsService],
  exports: [PhysicalDocumentsService],
})
export class PhysicalDocumentsModule {}
