import { Module } from '@nestjs/common';
import { SlaBreachService } from './sla-breach.service';
import { SlaBreachController } from './sla-breach.controller';

@Module({
  controllers: [SlaBreachController],
  providers: [SlaBreachService],
  exports: [SlaBreachService],
})
export class SlaModule {}
