import { Module } from '@nestjs/common';
import { CashFlowForecastService } from './cash-flow-forecast.service';
import { CashFlowForecastController } from './cash-flow-forecast.controller';

@Module({
  controllers: [CashFlowForecastController],
  providers: [CashFlowForecastService],
  exports: [CashFlowForecastService],
})
export class CashFlowForecastModule {}
