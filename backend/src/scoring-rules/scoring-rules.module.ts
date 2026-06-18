import { Module } from '@nestjs/common';
import { ScoringRulesService } from './scoring-rules.service';
import { ScoringRulesController } from './scoring-rules.controller';

@Module({
  controllers: [ScoringRulesController],
  providers: [ScoringRulesService],
  exports: [ScoringRulesService],
})
export class ScoringRulesModule {}
