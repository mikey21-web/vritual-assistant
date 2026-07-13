import { Module } from '@nestjs/common';
import { MarketMonitorService } from './market-monitor.service';
import { MarketMonitorController } from './market-monitor.controller';

@Module({
  controllers: [MarketMonitorController],
  providers: [MarketMonitorService],
})
export class MarketMonitorModule {}
