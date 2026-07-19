import { Module } from '@nestjs/common';
import { SalesHierarchyService } from './sales-hierarchy.service';
import { SalesHierarchyController } from './sales-hierarchy.controller';

@Module({
  controllers: [SalesHierarchyController],
  providers: [SalesHierarchyService],
  exports: [SalesHierarchyService],
})
export class SalesHierarchyModule {}
