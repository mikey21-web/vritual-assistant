import { Controller, Get, Post, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ApprovalsService } from './approvals.service';
import { ApprovalsAggregatorService } from './approvals-aggregator.service';
import { CreateApprovalRequestDto } from './dto/approvals.dto';

@ApiTags('Approvals')
@Controller('approvals')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ApprovalsController {
  constructor(
    private service: ApprovalsService,
    private aggregator: ApprovalsAggregatorService,
  ) {}

  @Get('pending')
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  pending(@Req() req: any) {
    return this.aggregator.findPending(req.user.tenantId);
  }

  @Get()
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  findAll(@Query() q: any, @Req() req: any) {
    return this.service.findAll(req.user.tenantId, q);
  }

  @Post()
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT')
  create(@Body() dto: CreateApprovalRequestDto, @Req() req: any) {
    return this.service.request(req.user.tenantId, {
      ...dto,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      requestedById: req.user.id,
    });
  }

  @Post(':id/approve')
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  approve(@Param('id') id: string, @Body('reason') reason: string, @Req() req: any) {
    return this.service.decide(req.user.tenantId, id, 'APPROVED', reason, req.user.id, req.user.role);
  }

  @Post(':id/reject')
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  reject(@Param('id') id: string, @Body('reason') reason: string, @Req() req: any) {
    return this.service.decide(req.user.tenantId, id, 'REJECTED', reason, req.user.id, req.user.role);
  }

  @Get('policies')
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  listPolicies(@Req() req: any) {
    return this.service.listPolicies(req.user.tenantId);
  }

  @Post('policies')
  @Roles('OWNER', 'ADMIN')
  createPolicy(@Body() dto: { type: string; minAmountPaise?: number; requiredRole: string }, @Req() req: any) {
    return this.service.createPolicy(req.user.tenantId, dto);
  }

  @Post('policies/:id/active')
  @Roles('OWNER', 'ADMIN')
  setPolicyActive(@Param('id') id: string, @Body('active') active: boolean, @Req() req: any) {
    return this.service.setPolicyActive(req.user.tenantId, id, active);
  }
}
