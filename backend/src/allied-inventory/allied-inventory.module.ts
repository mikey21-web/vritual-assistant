import { Module } from '@nestjs/common';
import { AlliedInventoryService } from './allied-inventory.service';
import { AlliedInventoryController } from './allied-inventory.controller';

@Module({
  controllers: [AlliedInventoryController],
  providers: [AlliedInventoryService],
  exports: [AlliedInventoryService],
})
export class AlliedInventoryModule {}
