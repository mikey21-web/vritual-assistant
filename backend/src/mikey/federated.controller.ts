import { Controller, Post, Get, Param, Query, Body, Logger } from '@nestjs/common';
import { FederatedService } from './federated.service';

@Controller('mikey/federated')
export class FederatedController {
  private readonly logger = new Logger(FederatedController.name);

  constructor(private federated: FederatedService) {}

  @Get('aggregates/:tenantId')
  async getAggregates(@Param('tenantId') tenantId: string) {
    return this.federated.computeLocalAggregates(tenantId);
  }

  @Post('push/:tenantId')
  async pushToAggregator(@Param('tenantId') tenantId: string) {
    const result = await this.federated.pushToAggregator(tenantId);
    return { pushed: result };
  }

  @Get('benchmarks/:tenantId')
  async getBenchmarks(@Param('tenantId') tenantId: string) {
    return this.federated.getLocalBenchmarks(tenantId);
  }

  @Get('privacy-report/:tenantId')
  async getPrivacyReport(@Param('tenantId') tenantId: string) {
    return this.federated.getPrivacyReport(tenantId);
  }

  @Get('opt-in/:tenantId')
  async getOptIn(@Param('tenantId') tenantId: string) {
    const optedIn = await this.federated.getOptIn(tenantId);
    return { tenantId, optedIn };
  }

  @Post('opt-in/:tenantId')
  async setOptIn(@Param('tenantId') tenantId: string, @Body() body: { optedIn: boolean }) {
    return this.federated.setOptIn(tenantId, body.optedIn);
  }
}
