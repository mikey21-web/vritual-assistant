import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { SlaBreachService } from './sla-breach.service';

@ApiTags('SLA')
@Controller('sla-breaches')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class SlaBreachController {
  constructor(private service: SlaBreachService) {}

  @Get()
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'VIEWER')
  findAll(@Query() q: any, @Req() req: any) {
    return this.service.findAll(req.user.tenantId, q);
  }
}
