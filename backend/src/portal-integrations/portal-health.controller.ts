import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
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
}
