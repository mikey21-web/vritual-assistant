import { Module } from '@nestjs/common';
import { ConstructionErpService } from './construction-erp.service';
import { ConstructionErpController } from './construction-erp.controller';

@Module({
  controllers: [ConstructionErpController],
  providers: [ConstructionErpService],
  exports: [ConstructionErpService],
})
export class ConstructionErpModule {}
