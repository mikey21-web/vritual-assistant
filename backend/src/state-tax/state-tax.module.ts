import { Module } from '@nestjs/common';
import { StateTaxService } from './state-tax.service';
import { StateTaxController } from './state-tax.controller';

@Module({
  controllers: [StateTaxController],
  providers: [StateTaxService],
  exports: [StateTaxService],
})
export class StateTaxModule {}
