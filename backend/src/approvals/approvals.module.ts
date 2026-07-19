import { Module } from '@nestjs/common';
import { ApprovalsService } from './approvals.service';
import { ApprovalsAggregatorService } from './approvals-aggregator.service';
import { ApprovalsController } from './approvals.controller';

@Module({
  controllers: [ApprovalsController],
  providers: [ApprovalsService, ApprovalsAggregatorService],
  exports: [ApprovalsService, ApprovalsAggregatorService],
})
export class ApprovalsModule {}
