import { Module } from '@nestjs/common';
import { TeamOpsService } from './team-ops.service';
import { TeamOpsController } from './team-ops.controller';

@Module({
  controllers: [TeamOpsController],
  providers: [TeamOpsService],
  exports: [TeamOpsService],
})
export class TeamOpsModule {}
