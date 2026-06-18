import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AnalyticsService } from './analytics.service';

@ApiTags('Analytics')
@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private service: AnalyticsService) {}
  @Get('overview') @Roles('OWNER', 'ADMIN', 'MANAGER', 'VIEWER') overview(@Req() req) { return this.service.overview(req.user?.tenantId); }
  @Get('sources') @Roles('OWNER', 'ADMIN', 'MANAGER', 'VIEWER') sources(@Req() req) { return this.service.sources(req.user?.tenantId); }
  @Get('campaigns') @Roles('OWNER', 'ADMIN', 'MANAGER', 'VIEWER') campaigns(@Req() req) { return this.service.campaigns(req.user?.tenantId); }
  @Get('conversions') @Roles('OWNER', 'ADMIN', 'MANAGER', 'VIEWER') conversions(@Req() req) { return this.service.conversions(req.user?.tenantId); }
  @Get('agents') @Roles('OWNER', 'ADMIN', 'MANAGER', 'VIEWER') agents(@Req() req) { return this.service.agents(req.user?.tenantId); }
}
