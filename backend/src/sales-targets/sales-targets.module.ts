import { Module } from '@nestjs/common';
import { SalesTargetsService } from './sales-targets.service';
import { SalesTargetsController } from './sales-targets.controller';

@Module({
  controllers: [SalesTargetsController],
  providers: [SalesTargetsService],
  exports: [SalesTargetsService],
})
export class SalesTargetsModule {}
