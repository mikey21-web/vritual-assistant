import { Controller, Post, Get, Param, Query, Body, Logger } from '@nestjs/common';
import { ReflexionService } from './reflexion.service';

@Controller('mikey/reflexion')
export class ReflexionController {
  private readonly logger = new Logger(ReflexionController.name);

  constructor(private reflexion: ReflexionService) {}

  @Post('reflect')
  async reflect(@Body() body: { tenantId: string; outcomeType: string; entityId: string }) {
    return this.reflexion.reflectOnOutcome(body.tenantId, body.outcomeType, body.entityId);
  }

  @Get('stats')
  async stats(@Query('tenantId') tenantId: string) {
    return this.reflexion.getReflexionStats(tenantId);
  }
}
