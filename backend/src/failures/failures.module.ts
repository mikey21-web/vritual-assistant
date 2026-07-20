import { Global, Module } from '@nestjs/common';
import { MonitoringModule } from '../monitoring/monitoring.module';
import { BullModule } from '@nestjs/bullmq';
import { FailuresService } from './failures.service';
import { FailuresController } from './failures.controller';
import { FailureRetryProcessor } from './failure-retry.processor';

@Global()
@Module({
  imports: [MonitoringModule, BullModule.registerQueue({ name: 'failure-retry' })],
  controllers: [FailuresController],
  providers: [FailuresService, FailureRetryProcessor],
  exports: [FailuresService],
})
export class FailuresModule {}
