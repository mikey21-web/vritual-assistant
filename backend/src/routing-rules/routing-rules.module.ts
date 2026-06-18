import { Module } from '@nestjs/common';
import { RoutingRulesService } from './routing-rules.service';
import { RoutingRulesController } from './routing-rules.controller';

@Module({
  controllers: [RoutingRulesController],
  providers: [RoutingRulesService],
  exports: [RoutingRulesService],
})
export class RoutingRulesModule {}
