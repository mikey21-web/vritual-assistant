import { Controller, Post, Body, HttpCode, Logger } from '@nestjs/common';
import { MarketMonitorService } from './market-monitor.service';
import { Public } from '../auth/public.decorator';

@Controller('market-monitor')
export class MarketMonitorController {
  private readonly logger = new Logger(MarketMonitorController.name);

  constructor(private service: MarketMonitorService) {}

  @Public()
  @Post('intel')
  @HttpCode(200)
  async receiveIntel(@Body() report: { findings: any[]; urgency: string; source: string; summary: string; timestamp: string }) {
    this.logger.log(`Intel webhook received: ${report.summary?.slice(0, 60)}`);
    await this.service.handleIntelReport(report);
    return { received: true };
  }
}
