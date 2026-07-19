import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { LaunchControlService } from './launch-control.service';

@ApiTags('Launch Control')
@Controller('launch-control')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class LaunchControlController {
  constructor(private service: LaunchControlService) {}

  @Get('status')
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  getStatus(@Req() req: any, @Query('projectId') projectId?: string) {
    return this.service.getStatus(req.user.tenantId, projectId);
  }
}
