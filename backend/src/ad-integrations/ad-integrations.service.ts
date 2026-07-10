import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class AdIntegrationsService {
  private readonly logger = new Logger(AdIntegrationsService.name);

  constructor(
    private config: ConfigService,
    private http: HttpService,
    private prisma: PrismaService,
    private auditLogs: AuditLogsService,
  ) {}

  private async getTenantId(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { tenantId: true } });
    if (!user) throw new NotFoundException('User not found');
    return user.tenantId;
  }

  async getConnections(userId: string) {
    const tenantId = await this.getTenantId(userId);
    const integrations = await this.prisma.integration.findMany({
      where: { tenantId, type: { in: ['meta_ads', 'google_ads'] } },
    });
    return integrations.map(i => ({
      platform: i.type === 'meta_ads' ? 'meta' : 'google',
      connected: i.isActive,
      status: i.status,
      name: i.name,
      lastSynced: (i.config as any)?.lastSyncedAt || null,
    }));
  }

  // === META ADS ===

  async connectMeta(userId: string, authorizationCode: string, redirectUri: string) {
    const tenantId = await this.getTenantId(userId);
    const appId = this.config.get('META_APP_ID');
    const appSecret = this.config.get('META_APP_SECRET');

    if (!appId || !appSecret) throw new BadRequestException('Meta Ads not configured');

    // Exchange code for access token
    const tokenRes = await firstValueFrom(
      this.http.get('https://graph.facebook.com/v19.0/oauth/access_token', {
        params: {
          client_id: appId,
          client_secret: appSecret,
          redirect_uri: redirectUri,
          code: authorizationCode,
        },
      })
    );
    const accessToken = tokenRes.data.access_token;

    // Get ad accounts
    const accountsRes = await firstValueFrom(
      this.http.get('https://graph.facebook.com/v19.0/me/adaccounts', {
        params: { fields: 'id,name,account_status,currency', access_token: accessToken },
      })
    );
    const adAccounts = accountsRes.data.data || [];

    // Store first ad account
    const adAccount = adAccounts[0];
    if (!adAccount) throw new BadRequestException('No Meta ad accounts found for this user');

    // Upsert integration
    const existing = await this.prisma.integration.findFirst({
      where: { tenantId, type: 'meta_ads' },
    });

    const config = {
      accessToken,
      adAccountId: adAccount.id,
      adAccountName: adAccount.name,
      currency: adAccount.currency,
      lastSyncedAt: null,
    };

    if (existing) {
      await this.prisma.integration.update({
        where: { id: existing.id },
        data: { config, isActive: true, status: 'connected', name: `Meta Ads — ${adAccount.name}` },
      });
    } else {
      await this.prisma.integration.create({
        data: {
          tenantId,
          type: 'meta_ads',
          name: `Meta Ads — ${adAccount.name}`,
          config,
          isActive: true,
          status: 'connected',
        },
      });
    }

    await this.auditLogs.log('ad_platform_connected', 'Integration', undefined, userId, { platform: 'meta', adAccount: adAccount.name });
    return { success: true, platform: 'meta', adAccount: adAccount.name };
  }

  async disconnectMeta(userId: string) {
    const tenantId = await this.getTenantId(userId);
    await this.prisma.integration.updateMany({
      where: { tenantId, type: 'meta_ads' },
      data: { isActive: false, status: 'disconnected' },
    });
    await this.auditLogs.log('ad_platform_disconnected', 'Integration', undefined, userId, { platform: 'meta' });
    return { success: true };
  }

  // === GOOGLE ADS ===

  async connectGoogle(userId: string, authorizationCode: string, redirectUri: string) {
    const tenantId = await this.getTenantId(userId);
    const clientId = this.config.get('GOOGLE_ADS_CLIENT_ID');
    const clientSecret = this.config.get('GOOGLE_ADS_CLIENT_SECRET');

    if (!clientId || !clientSecret) throw new BadRequestException('Google Ads not configured');

    // Exchange code for tokens
    const tokenRes = await firstValueFrom(
      this.http.post('https://oauth2.googleapis.com/token', {
        code: authorizationCode,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      })
    );
    const { access_token, refresh_token } = tokenRes.data;

    // Upsert integration
    const existing = await this.prisma.integration.findFirst({
      where: { tenantId, type: 'google_ads' },
    });

    const config = {
      accessToken: access_token,
      refreshToken: refresh_token,
      lastSyncedAt: null,
    };

    if (existing) {
      await this.prisma.integration.update({
        where: { id: existing.id },
        data: { config, isActive: true, status: 'connected', name: 'Google Ads' },
      });
    } else {
      await this.prisma.integration.create({
        data: {
          tenantId,
          type: 'google_ads',
          name: 'Google Ads',
          config,
          isActive: true,
          status: 'connected',
        },
      });
    }

    await this.auditLogs.log('ad_platform_connected', 'Integration', undefined, userId, { platform: 'google' });
    return { success: true, platform: 'google' };
  }

  async disconnectGoogle(userId: string) {
    const tenantId = await this.getTenantId(userId);
    await this.prisma.integration.updateMany({
      where: { tenantId, type: 'google_ads' },
      data: { isActive: false, status: 'disconnected' },
    });
    await this.auditLogs.log('ad_platform_disconnected', 'Integration', undefined, userId, { platform: 'google' });
    return { success: true };
  }

  // === CAMPAIGNS ===

  async getCampaigns(userId: string, platform?: string) {
    const tenantId = await this.getTenantId(userId);
    const where: any = { tenantId };
    if (platform) where.platform = platform;
    return this.prisma.adCampaign.findMany({ where, orderBy: { spend: 'desc' }, take: 100 });
  }

  async syncCampaigns(userId: string) {
    const tenantId = await this.getTenantId(userId);
    const results: any[] = [];

    // Sync Meta campaigns
    const metaInt = await this.prisma.integration.findFirst({
      where: { tenantId, type: 'meta_ads', isActive: true },
    });
    if (metaInt) {
      try {
        const cfg = metaInt.config as any;
        const adAccountId = cfg.adAccountId?.replace('act_', '');
        const res = await firstValueFrom(
          this.http.get(`https://graph.facebook.com/v19.0/act_${adAccountId}/campaigns`, {
            params: {
              fields: 'id,name,status,daily_budget,lifetime_budget,insights{spend,impressions,clicks,ctr,cpc}',
              access_token: cfg.accessToken,
            },
          })
        );
        const campaigns = res.data.data || [];
        for (const c of campaigns) {
          const ins = c.insights?.data?.[0] || {};
          await this.prisma.adCampaign.upsert({
            where: { tenantId_externalId: { tenantId, externalId: c.id } },
            create: {
              tenantId,
              platform: 'meta',
              externalId: c.id,
              name: c.name,
              status: c.status,
              dailyBudget: c.daily_budget ? Number(c.daily_budget) / 100 : null,
              lifetimeBudget: c.lifetime_budget ? Number(c.lifetime_budget) / 100 : null,
              spend: ins.spend ? Number(ins.spend) : 0,
              impressions: ins.impressions ? Number(ins.impressions) : 0,
              clicks: ins.clicks ? Number(ins.clicks) : 0,
              ctr: ins.ctr ? Number(ins.ctr) : 0,
              cpc: ins.cpc ? Number(ins.cpc) : 0,
              lastSyncedAt: new Date(),
            },
            update: {
              name: c.name,
              status: c.status,
              dailyBudget: c.daily_budget ? Number(c.daily_budget) / 100 : null,
              lifetimeBudget: c.lifetime_budget ? Number(c.lifetime_budget) / 100 : null,
              spend: ins.spend ? Number(ins.spend) : 0,
              impressions: ins.impressions ? Number(ins.impressions) : 0,
              clicks: ins.clicks ? Number(ins.clicks) : 0,
              ctr: ins.ctr ? Number(ins.ctr) : 0,
              cpc: ins.cpc ? Number(ins.cpc) : 0,
              lastSyncedAt: new Date(),
            },
          });
        }
        results.push({ platform: 'meta', synced: campaigns.length });
      } catch (e: any) {
        this.logger.error(`Meta sync failed: ${e.message}`);
        results.push({ platform: 'meta', synced: 0, error: e.message });
      }
    }

    // Sync Google Ads campaigns
    const googleInt = await this.prisma.integration.findFirst({
      where: { tenantId, type: 'google_ads', isActive: true },
    });
    if (googleInt) {
      try {
        const cfg = googleInt.config as any;
        const tokenRes = await firstValueFrom(
          this.http.post('https://oauth2.googleapis.com/token', {
            client_id: this.config.get('GOOGLE_ADS_CLIENT_ID'),
            client_secret: this.config.get('GOOGLE_ADS_CLIENT_SECRET'),
            refresh_token: cfg.refreshToken,
            grant_type: 'refresh_token',
          })
        );
        const accessToken = tokenRes.data.access_token;
        const customerId = cfg.customerId;
        if (customerId && accessToken) {
          const query = 'SELECT campaign.id, campaign.name, campaign.status, campaign.optimization_score, metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.ctr, metrics.average_cpc FROM campaign WHERE campaign.status != "REMOVED"';
          const gaRes = await firstValueFrom(
            this.http.post(`https://googleads.googleapis.com/v17/customers/${customerId}/googleAds:search`, {
              query,
            }, { headers: { Authorization: `Bearer ${accessToken}`, 'developer-token': this.config.get('GOOGLE_ADS_DEVELOPER_TOKEN') } })
          );
          const campaigns = gaRes.data.results || [];
          for (const c of campaigns) {
            const camp = c.campaign;
            const m = c.metrics;
            await this.prisma.adCampaign.upsert({
              where: { tenantId_externalId: { tenantId, externalId: String(camp.id) } },
              create: {
                tenantId,
                platform: 'google',
                externalId: String(camp.id),
                name: camp.name,
                status: camp.status,
                spend: m?.costMicros ? Number(m.costMicros) / 1_000_000 : 0,
                impressions: m?.impressions ? Number(m.impressions) : 0,
                clicks: m?.clicks ? Number(m.clicks) : 0,
                ctr: m?.ctr ? Number(m.ctr) : 0,
                cpc: m?.averageCpc ? Number(m.averageCpc) / 1_000_000 : 0,
                lastSyncedAt: new Date(),
              },
              update: {
                name: camp.name,
                status: camp.status,
                spend: m?.costMicros ? Number(m.costMicros) / 1_000_000 : 0,
                impressions: m?.impressions ? Number(m.impressions) : 0,
                clicks: m?.clicks ? Number(m.clicks) : 0,
                ctr: m?.ctr ? Number(m.ctr) : 0,
                cpc: m?.averageCpc ? Number(m.averageCpc) / 1_000_000 : 0,
                lastSyncedAt: new Date(),
              },
            });
          }
          results.push({ platform: 'google', synced: campaigns.length });
        }
      } catch (e: any) {
        this.logger.error(`Google sync failed: ${e.message}`);
        results.push({ platform: 'google', synced: 0, error: e.message });
      }
    }

    await this.auditLogs.log('ad_campaigns_synced', 'AdCampaign', undefined, userId, { results });
    return { results };
  }

  // === AD LEADS ===

  async getAdLeads(userId: string, platform?: string) {
    const tenantId = await this.getTenantId(userId);
    const where: any = { source: { in: ['META_ADS', 'GOOGLE_ADS'] } };
    if (platform === 'meta') where.source = 'META_ADS';
    if (platform === 'google') where.source = 'GOOGLE_ADS';
    return this.prisma.lead.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { contact: { select: { name: true, email: true, phone: true } } },
    });
  }
}
