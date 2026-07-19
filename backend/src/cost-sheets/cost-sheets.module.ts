import { Module } from '@nestjs/common';
import { CostSheetsService } from './cost-sheets.service';
import { CostSheetsController } from './cost-sheets.controller';
import { StateTaxModule } from '../state-tax/state-tax.module';

@Module({
  imports: [StateTaxModule],
  controllers: [CostSheetsController],
  providers: [CostSheetsService],
  exports: [CostSheetsService],
})
export class CostSheetsModule {}
