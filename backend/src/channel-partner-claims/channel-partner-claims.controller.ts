import { Controller, Get, Post, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ChannelPartnerClaimsService } from './channel-partner-claims.service';
import { RegisterLeadClaimDto, CreateCommissionAccrualDto, CreatePayoutDto } from './dto/channel-partner-claims.dto';

@ApiTags('Channel Partner Claims')
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ChannelPartnerClaimsController {
  constructor(private service: ChannelPartnerClaimsService) {}

  @Get('partner-lead-claims')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'VIEWER')
  findAll(@Query() q: any, @Req() req: any) {
    return this.service.findAll(req.user.tenantId, q);
  }

  @Get('channel-partners/performance')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'VIEWER')
  performance(@Req() req: any) {
    return this.service.getPerformance(req.user.tenantId);
  }

  @Post('partner-lead-claims')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT')
  register(@Body() dto: RegisterLeadClaimDto, @Req() req: any) {
    return this.service.registerClaim(req.user.tenantId, dto);
  }

  @Post('partner-lead-claims/:id/resolve')
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  resolve(@Param('id') id: string, @Body() body: { decision: 'REGISTERED' | 'REJECTED'; reason?: string }, @Req() req: any) {
    return this.service.resolve(req.user.tenantId, id, body.decision, body.reason, req.user.id);
  }

  @Get('commission-accruals')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'VIEWER')
  findAccruals(@Query() q: any, @Req() req: any) {
    return this.service.findAccruals(req.user.tenantId, q);
  }

  @Post('commission-accruals')
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  createAccrual(@Body() dto: CreateCommissionAccrualDto, @Req() req: any) {
    return this.service.createAccrual(req.user.tenantId, dto);
  }

  @Post('commission-accruals/:id/approve')
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  approveAccrual(@Param('id') id: string, @Req() req: any) {
    return this.service.approveAccrual(req.user.tenantId, id, req.user.id);
  }

  @Post('commission-payouts')
  @Roles('OWNER', 'ADMIN')
  createPayout(@Body() dto: CreatePayoutDto, @Req() req: any) {
    return this.service.createPayout(req.user.tenantId, dto.channelPartnerId, dto.accrualIds, req.user.id);
  }
}
