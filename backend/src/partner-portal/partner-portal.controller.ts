import { Controller, Get, Post, Body, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Public } from '../auth/public.decorator';
import { PartnerAuthGuard } from './partner-auth.guard';
import { PartnerAuthService } from './partner-auth.service';
import { PartnerPortalService } from './partner-portal.service';
import { ChannelPartnerClaimsService } from '../channel-partner-claims/channel-partner-claims.service';
import { PartnerLoginDto, RegisterPartnerLeadDto } from './dto/partner-portal.dto';

/**
 * Partner-facing surface. @Public() at the class level opts every route out
 * of the app's global JwtAuthGuard/RolesGuard (which only understand
 * internal User accounts) — auth here is entirely delegated to
 * PartnerAuthGuard, a distinct passport strategy scoped to PartnerPortalUser.
 * A partner session can only ever see its own channelPartnerId's data
 * (spec 48.12).
 */
@ApiTags('Partner Portal')
@Controller('partner-portal')
@Public()
export class PartnerPortalController {
  constructor(
    private authService: PartnerAuthService,
    private portalService: PartnerPortalService,
    private claims: ChannelPartnerClaimsService,
  ) {}

  @Post('login')
  login(@Body() dto: PartnerLoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @UseGuards(PartnerAuthGuard)
  @ApiBearerAuth()
  @Get('me')
  me(@Req() req: any) {
    return { email: req.user.email, channelPartnerId: req.user.channelPartnerId };
  }

  @UseGuards(PartnerAuthGuard)
  @ApiBearerAuth()
  @Get('projects')
  projects(@Req() req: any) {
    return this.portalService.listProjects(req.user.tenantId);
  }

  @UseGuards(PartnerAuthGuard)
  @ApiBearerAuth()
  @Get('units')
  units(@Query('projectId') projectId: string, @Req() req: any) {
    return this.portalService.listAvailableUnits(req.user.tenantId, projectId);
  }

  @UseGuards(PartnerAuthGuard)
  @ApiBearerAuth()
  @Post('leads')
  registerLead(@Body() dto: RegisterPartnerLeadDto, @Req() req: any) {
    return this.claims.registerClaim(req.user.tenantId, {
      channelPartnerId: req.user.channelPartnerId,
      phone: dto.phone,
      leadId: dto.leadId,
    });
  }

  @UseGuards(PartnerAuthGuard)
  @ApiBearerAuth()
  @Get('leads')
  myLeads(@Req() req: any) {
    return this.claims.findAll(req.user.tenantId, { channelPartnerId: req.user.channelPartnerId });
  }

  @UseGuards(PartnerAuthGuard)
  @ApiBearerAuth()
  @Get('commissions')
  myCommissions(@Req() req: any) {
    return this.claims.findAccruals(req.user.tenantId, { channelPartnerId: req.user.channelPartnerId });
  }
}
