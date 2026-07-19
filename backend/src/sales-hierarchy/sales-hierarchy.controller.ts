import { Controller, Get, Post, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { SalesHierarchyService } from './sales-hierarchy.service';

@ApiTags('Sales Hierarchy')
@Controller('sales-hierarchy')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class SalesHierarchyController {
  constructor(private service: SalesHierarchyService) {}

  @Post('users/:userId/manager') @Roles('OWNER', 'ADMIN', 'MANAGER')
  setManager(@Param('userId') userId: string, @Body('managerId') managerId: string | null, @Req() req: any) {
    return this.service.setManager(req.user.tenantId, userId, managerId ?? null);
  }

  @Get('users/:userId/team') @Roles('OWNER', 'ADMIN', 'MANAGER')
  getTeamTree(@Param('userId') userId: string, @Req() req: any) {
    return this.service.getTeamTree(req.user.tenantId, userId);
  }

  @Post('users/:userId/territories/:projectId') @Roles('OWNER', 'ADMIN', 'MANAGER')
  assignTerritory(@Param('userId') userId: string, @Param('projectId') projectId: string, @Req() req: any) {
    return this.service.assignTerritory(req.user.tenantId, userId, projectId);
  }

  @Delete('users/:userId/territories/:projectId') @Roles('OWNER', 'ADMIN', 'MANAGER')
  removeTerritory(@Param('userId') userId: string, @Param('projectId') projectId: string, @Req() req: any) {
    return this.service.removeTerritory(req.user.tenantId, userId, projectId);
  }

  @Get('users/:userId/territories') @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'VIEWER')
  listTerritories(@Param('userId') userId: string, @Req() req: any) {
    return this.service.listTerritories(req.user.tenantId, userId);
  }
}
