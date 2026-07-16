import { Controller, Get, Post, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AutonomousActionService } from './autonomous-action.service';

@ApiTags('Mikey Autonomous Actions')
@Controller('mikey/autonomous-actions')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AutonomousActionController {
  constructor(private service: AutonomousActionService) {}

  @Get()
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: "Recent actions Mikey took on its own, without being asked" })
  findRecent(@Query('hours') hours: string | undefined, @Req() req: any) {
    return this.service.findRecent(req.user?.tenantId || 'default-tenant', hours ? parseInt(hours, 10) : 24);
  }

  @Post(':id/undo')
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Reverse an autonomous action, where reversible' })
  undo(@Param('id') id: string, @Req() req: any) {
    return this.service.undo(id, req.user.sub);
  }
}
