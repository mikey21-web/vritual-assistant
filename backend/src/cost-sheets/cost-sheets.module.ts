import { Module } from '@nestjs/common';
import { CostSheetsService } from './cost-sheets.service';
import { CostSheetsController } from './cost-sheets.controller';
import { StateTaxModule } from '../state-tax/state-tax.module';
import { AutomationModule } from '../automation/automation.module';

@Module({
  imports: [StateTaxModule, AutomationModule],
  controllers: [CostSheetsController],
  providers: [CostSheetsService],
  exports: [CostSheetsService],
})
export class CostSheetsModule {}
