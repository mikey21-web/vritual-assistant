import { Controller, Get, UseGuards } from '@nestjs/common';
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
  @Get('overview') @Roles('OWNER', 'ADMIN', 'MANAGER') overview() { return this.service.overview(); }
  @Get('forecast') @Roles('OWNER', 'ADMIN', 'MANAGER') forecast() { return this.service.forecast(); }
  @Get('sources') @Roles('OWNER', 'ADMIN', 'MANAGER') sources() { return this.service.sources(); }
  @Get('campaigns') @Roles('OWNER', 'ADMIN', 'MANAGER') campaigns() { return this.service.campaigns(); }
  @Get('conversions') @Roles('OWNER', 'ADMIN', 'MANAGER') conversions() { return this.service.conversions(); }
  @Get('agents') @Roles('OWNER', 'ADMIN', 'MANAGER') agents() { return this.service.agents(); }
  @Get('data-health') @Roles('OWNER', 'ADMIN', 'MANAGER') dataHealth() { return this.service.dataHealth(); }
}
