import { Module } from '@nestjs/common';
import { CostSheetsService } from './cost-sheets.service';
import { CostSheetsController } from './cost-sheets.controller';

@Module({
  controllers: [CostSheetsController],
  providers: [CostSheetsService],
  exports: [CostSheetsService],
})
export class CostSheetsModule {}
