import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { MetricsService } from './metrics.service';
import { MetricsController } from './metrics.controller';
import { MonitoringService } from './monitoring.service';
import { AlertingService } from './alerting.service';
import { SyntheticCheckService } from './synthetic-check.service';
import { MonitoringController } from './monitoring.controller';

@Global()
@Module({
  imports: [
    BullModule.registerQueue({ name: 'monitoring' }),
  ],
  controllers: [MetricsController, MonitoringController],
  providers: [MetricsService, MonitoringService, AlertingService, SyntheticCheckService],
  exports: [MetricsService, MonitoringService, AlertingService, SyntheticCheckService],
})
export class MonitoringModule {}
