import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { MetricsService } from './metrics.service';
import { MetricsController } from './metrics.controller';
import { MonitoringService } from './monitoring.service';
import { AlertingService } from './alerting.service';
import { MonitoringController } from './monitoring.controller';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'monitoring' }),
  ],
  controllers: [MetricsController, MonitoringController],
  providers: [MetricsService, MonitoringService, AlertingService],
  exports: [MetricsService, MonitoringService, AlertingService],
})
export class MonitoringModule {}
