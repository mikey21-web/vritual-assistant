import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Public } from '../auth/public.decorator';
import { HealthService } from './health.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private health: HealthService) {}

  @Public()
  @Get()
  check() { return this.health.shallow(); }

  @Public()
  @Get('live')
  live() { return { status: 'ok', timestamp: new Date().toISOString() }; }

  @Public()
  @Get('ready')
  ready() { return this.health.check(); }

  @Get('deep')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN')
  deepCheck() { return this.health.deep(); }
}
