import { Module } from '@nestjs/common';
import { UnitHoldsService } from './unit-holds.service';
import { UnitHoldsController } from './unit-holds.controller';

@Module({
  controllers: [UnitHoldsController],
  providers: [UnitHoldsService],
  exports: [UnitHoldsService],
})
export class UnitHoldsModule {}
