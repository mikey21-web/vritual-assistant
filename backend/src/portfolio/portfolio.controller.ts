import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { PortfolioService } from './portfolio.service';

@ApiTags('Portfolio Dashboard')
@Controller('portfolio')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class PortfolioController {
  constructor(private service: PortfolioService) {}

  @Get('overview')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'VIEWER')
  overview(@Req() req: any) {
    return this.service.getOverview(req.user.tenantId);
  }

  @Get('entities')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'VIEWER')
  entities(@Req() req: any, @Query('type') type?: string, @Query('id') id?: string) {
    return this.service.getEntitySummary(req.user.tenantId, type || 'project', id);
  }

  @Get('cash-position')
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  cashPosition(@Req() req: any) {
    return this.service.getCashPosition(req.user.tenantId);
  }
}
