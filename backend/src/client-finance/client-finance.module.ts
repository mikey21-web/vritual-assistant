import { Module } from '@nestjs/common';
import { ClientFinanceService } from './client-finance.service';
import { ClientFinanceController } from './client-finance.controller';

@Module({
  controllers: [ClientFinanceController],
  providers: [ClientFinanceService],
  exports: [ClientFinanceService],
})
export class ClientFinanceModule {}
