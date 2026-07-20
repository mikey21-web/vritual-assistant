import { Controller, Get, Post, UseGuards, Body, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Public } from '../auth/public.decorator';
import { MonitoringService } from './monitoring.service';
import { AlertingService } from './alerting.service';
import { SyntheticCheckService, CheckResult } from './synthetic-check.service';

class TestAlertDto {
  channel: string;
  message?: string;
  severity?: string;
}

@ApiTags('Monitoring')
@ApiBearerAuth()
@Controller('monitoring')
export class MonitoringController {
  private readonly logger = new Logger(MonitoringController.name);

  constructor(
    private monitoring: MonitoringService,
    private alerting: AlertingService,
    private synthetic: SyntheticCheckService,
  ) {}

  @Get('health')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Full health check — all services, integrations, and dependencies' })
  async health() {
    return this.monitoring.checkAll();
  }

  @Public()
  @Get('status')
  @ApiOperation({ summary: 'Simple public status endpoint (database ping)' })
  async status() {
    return this.monitoring.getSimpleStatus();
  }

  @Get('synthetic')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Run all synthetic checks on demand' })
  async runSynthetic(): Promise<{ passed: boolean; results: CheckResult[] }> {
    return this.synthetic.runAll();
  }

  @Post('test-alert')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER')
  @ApiOperation({ summary: 'Send a test alert to verify alert channel configuration' })
  async testAlert(@Body() dto: TestAlertDto) {
    const channel = dto.channel as any;
    const message = dto.message || 'This is a test alert from LeadAuto Monitoring';
    const severity = (dto.severity || 'medium') as any;

    const result = await this.alerting.sendAlert(channel, message, severity);

    return {
      sent: result.sent,
      channel: result.channel,
      message: result.sent
        ? `Test alert sent successfully via ${channel}`
        : `Failed to send test alert: ${result.error}`,
      error: result.error || null,
      deliveredAt: new Date().toISOString(),
    };
  }
}
