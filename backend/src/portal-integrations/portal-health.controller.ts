import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { PortalHealthService } from './portal-health.service';

@ApiTags('Portal Integrations')
@Controller('portal-integrations')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class PortalHealthController {
  constructor(private service: PortalHealthService) {}

  @Get('health')
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  getHealth() {
    return this.service.getHealth();
  }

  @Post('health/:provider/replay')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Replay the last failed webhook event for a provider' })
  replayFailed(@Param('provider') provider: string) {
    return this.service.replayFailed(provider);
  }
}
