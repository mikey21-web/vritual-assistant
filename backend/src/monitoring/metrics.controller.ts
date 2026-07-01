import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/public.decorator';
import { MetricsService } from './metrics.service';

@ApiTags('Monitoring')
@Controller()
export class MetricsController {
  constructor(private metrics: MetricsService) {}

  @Public()
  @Get('metrics')
  async getMetrics(@Res() res: Response) {
    res.set('Content-Type', this.metrics.contentType);
    res.send(await this.metrics.metrics);
  }
}
