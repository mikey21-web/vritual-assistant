import { Controller, Get, Post, Delete, Param, Body, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AdIntegrationsService } from './ad-integrations.service';
import { ConfigService } from '@nestjs/config';

@ApiTags('Ad Integrations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('ad-integrations')
export class AdIntegrationsController {
  constructor(
    private svc: AdIntegrationsService,
    private config: ConfigService,
  ) {}

  @Get('connections')
  @Roles('OWNER', 'ADMIN')
  getConnections(@Req() req) {
    return this.svc.getConnections(req.user.sub);
  }

  @Post('meta/connect')
  @Roles('OWNER', 'ADMIN')
  async connectMeta(@Req() req, @Body('authorizationCode') code: string, @Body('redirectUri') redirectUri: string) {
    return this.svc.connectMeta(req.user.sub, code, redirectUri);
  }

  @Post('google/connect')
  @Roles('OWNER', 'ADMIN')
  async connectGoogle(@Req() req, @Body('authorizationCode') code: string, @Body('redirectUri') redirectUri: string) {
    return this.svc.connectGoogle(req.user.sub, code, redirectUri);
  }

  @Post('meta/disconnect')
  @Roles('OWNER', 'ADMIN')
  disconnectMeta(@Req() req) {
    return this.svc.disconnectMeta(req.user.sub);
  }

  @Post('google/disconnect')
  @Roles('OWNER', 'ADMIN')
  disconnectGoogle(@Req() req) {
    return this.svc.disconnectGoogle(req.user.sub);
  }

  @Get('meta/oauth-url')
  getMetaOAuthUrl() {
    const appId = this.config.get('META_APP_ID');
    const redirect = this.config.get('META_REDIRECT_URI');
    if (!appId) return { error: 'Meta Ads not configured (META_APP_ID missing)' };
    const url = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirect || '')}&scope=ads_read,leads_retrieval,pages_read_engagement,business_management&response_type=code`;
    return { url };
  }

  @Get('google/oauth-url')
  getGoogleOAuthUrl() {
    const clientId = this.config.get('GOOGLE_ADS_CLIENT_ID');
    const redirect = this.config.get('GOOGLE_ADS_REDIRECT_URI');
    if (!clientId) return { error: 'Google Ads not configured (GOOGLE_ADS_CLIENT_ID missing)' };
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirect || '')}&response_type=code&scope=https://www.googleapis.com/auth/adwords&access_type=offline&prompt=consent`;
    return { url };
  }

  @Get('campaigns')
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  getCampaigns(@Req() req, @Query('platform') platform?: string) {
    return this.svc.getCampaigns(req.user.sub, platform);
  }

  @Post('campaigns/sync')
  @Roles('OWNER', 'ADMIN')
  syncCampaigns(@Req() req) {
    return this.svc.syncCampaigns(req.user.sub);
  }

  @Get('leads')
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  getAdLeads(@Req() req, @Query('platform') platform?: string) {
    return this.svc.getAdLeads(req.user.sub, platform);
  }
}
