import { Controller, Post, Get, Patch, Body, Param, Query, Req, UseGuards, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CampaignDispatcherService } from '../campaigns/campaign-dispatcher.service';
import OpenAI from 'openai';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('ai/campaigns')
export class AICampaignsController {
  private readonly logger = new Logger(AICampaignsController.name);
  private client: OpenAI;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
    private campaignDispatcher: CampaignDispatcherService,
  ) {
    const apiKey = this.config.get<string>('DEEPSEEK_API_KEY');
    const baseURL = this.config.get<string>('DEEPSEEK_BASE_URL') || 'https://api.deepseek.com/v1';
    if (apiKey) {
      this.client = new OpenAI({ apiKey, baseURL });
    }
  }

  @Post('generate')
  async generate(@Body() body: { prompt: string }) {
    if (!body.prompt?.trim()) throw new Error('Prompt is required');
    if (!this.client) throw new Error('AI not configured');

    const response = await this.client.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: `You are a real estate campaign strategist. Given a user's prompt, generate a complete campaign draft.

Respond in JSON format (no markdown, no backticks):
{
  "name": "short campaign name",
  "description": "2-3 sentence description of the campaign strategy",
  "campaignType": "whatsapp_broadcast | festive_offer | new_launch | site_visit_invite | referral | re_engagement | payment_reminder",
  "targeting": {
    "segments": ["HOT", "WARM", "COLD"],
    "locations": ["Bangalore", "Whitefield"],
    "propertyTypes": ["2BHK", "3BHK", "Villa"],
    "budgetRanges": ["50-80L", "80L-1.2Cr"],
    "minScore": 0
  },
  "channels": [
    { "type": "WHATSAPP", "active": true, "config": { "templateName": "promotional" } }
  ],
  "message": "full campaign message with {name} and {project_name} placeholders, under 500 chars",
  "schedule": { "start": "ISO date", "end": "ISO date" },
  "totalBudget": 5000,
  "offer": "Special discount or offer description",
  "landingUrl": "https://realestate.deploysafe.in/property/...",
  "conversionGoal": "site_visit | booking | brochure_download",
  "imagePrompt": "detailed text-to-image prompt for generating a campaign creative image, describing the property scene, atmosphere, text overlay suggestions",
  "predictedROI": "180%"
}

Rules:
- Keep message concise (under 500 chars), use {name} and {project_name} placeholders
- Budget realistic for Indian real estate (1000-50000 INR)
- imagePrompt should describe a photorealistic scene for a real estate ad
- Always include at least 2 channels (WHATSAPP as primary, SMS or EMAIL as secondary)
- campaignType must match one of the listed options
- targeting.segments must be an array of valid segment strings`,
        },
        { role: 'user', content: body.prompt },
      ],
      max_tokens: 1500,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content || '{}';
    const draft = JSON.parse(content);
    return draft;
  }

  @Post('generate-image')
  async generateImage(@Body() body: { prompt: string }) {
    if (!body.prompt?.trim()) throw new Error('Prompt is required');

    const openaiKey = this.config.get<string>('OPENAI_API_KEY');
    if (!openaiKey) {
      return { generated: false, message: 'OpenAI API key not configured. Add OPENAI_API_KEY to environment.', prompt: body.prompt };
    }

    try {
      const res = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openaiKey}` },
        body: JSON.stringify({ model: 'dall-e-3', prompt: body.prompt, n: 1, size: '1024x1024', response_format: 'b64_json' }),
      });
      const data = await res.json() as any;
      if (!data.data?.[0]?.b64_json) throw new Error(data.error?.message || 'Image generation failed');

      return { generated: true, image: `data:image/png;base64,${data.data[0].b64_json}`, format: 'png', prompt: body.prompt };
    } catch (e: any) {
      this.logger.error('Image generation failed', e.message);
      return { generated: false, message: `Image generation failed: ${e.message}`, prompt: body.prompt };
    }
  }

  @Get()
  async list(@Query() q: { status?: string }, @Req() req) {
    const where: any = { sourceType: 'AI', creatorId: req.user.sub };
    if (q.status) where.status = q.status;
    return this.prisma.campaign.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  @Post()
  async saveDraft(@Body() body: any, @Req() req) {
    const campaign = await this.prisma.campaign.create({
      data: {
        tenantId: req.user.tenantId || 'default-tenant',
        name: body.name || 'AI Campaign',
        description: body.description || '',
        sourceType: 'AI',
        campaignType: body.campaignType || 'whatsapp_broadcast',
        status: 'draft',
        active: false,
        offer: body.offer || null,
        landingUrl: body.landingUrl || null,
        conversionGoal: body.conversionGoal || null,
        totalBudget: body.totalBudget || 0,
        budget: body.budget || {},
        targeting: body.targeting || {},
        channels: body.channels || [{ type: 'WHATSAPP', active: true }],
        creatives: body.creatives || [],
        startDate: body.schedule?.start ? new Date(body.schedule.start) : null,
        endDate: body.schedule?.end ? new Date(body.schedule.end) : null,
        creatorId: req.user.sub,
        tags: body.tags || [],
      },
    });
    return campaign;
  }

  @Patch(':id')
  async updateDraft(@Param('id') id: string, @Body() body: any, @Req() req) {
    const existing = await this.prisma.campaign.findUnique({ where: { id } });
    if (!existing) throw new Error('Campaign not found');
    if (existing.creatorId !== req.user.sub) throw new Error('Not authorized');

    const updateData: any = {};
    if (body.name) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.campaignType) updateData.campaignType = body.campaignType;
    if (body.offer !== undefined) updateData.offer = body.offer;
    if (body.landingUrl !== undefined) updateData.landingUrl = body.landingUrl;
    if (body.conversionGoal !== undefined) updateData.conversionGoal = body.conversionGoal;
    if (body.totalBudget !== undefined) updateData.totalBudget = body.totalBudget;
    if (body.budget) updateData.budget = body.budget;
    if (body.targeting) updateData.targeting = body.targeting;
    if (body.channels) updateData.channels = body.channels;
    if (body.creatives) updateData.creatives = body.creatives;
    if (body.tags) updateData.tags = body.tags;
    if (body.schedule?.start) updateData.startDate = new Date(body.schedule.start);
    if (body.schedule?.end) updateData.endDate = new Date(body.schedule.end);
    if (body.message) updateData.description = body.message;

    return this.prisma.campaign.update({ where: { id }, data: updateData });
  }

  @Post(':id/launch')
  async launchCampaign(@Param('id') id: string, @Req() req) {
    const existing = await this.prisma.campaign.findUnique({ where: { id } });
    if (!existing) throw new Error('Campaign not found');
    if (existing.creatorId !== req.user.sub) throw new Error('Not authorized');

    const updated = await this.prisma.campaign.update({
      where: { id },
      data: { status: 'active', active: true, startDate: new Date() },
    });

    await this.prisma.campaignTimelineEntry.create({
      data: {
        campaignId: id,
        event: 'campaign_launched',
        detail: 'AI-generated campaign launched',
        userId: req.user.sub,
        metadata: { source: 'ai_campaign_manager' },
      },
    });

    // Dispatch campaign messages to target leads
    this.campaignDispatcher.dispatchCampaign(id, req.user.sub).then(result => {
      this.prisma.campaignTimelineEntry.create({
        data: {
          campaignId: id,
          event: 'campaign_dispatched',
          detail: `Dispatched to ${result.sent} leads (${result.skipped} skipped, ${result.errors} errors)`,
          userId: req.user.sub,
          metadata: result,
        },
      });
    }).catch(err => {
      this.logger.error(`Campaign dispatch failed: ${err.message}`);
    });

    return updated;
  }
}
