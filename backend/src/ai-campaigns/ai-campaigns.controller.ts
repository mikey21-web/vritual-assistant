import { Controller, Post, Get, Body, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Controller('ai/campaigns')
export class AICampaignsController {
  private readonly logger = new Logger(AICampaignsController.name);
  private client: OpenAI;

  constructor(private config: ConfigService) {
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
          content: `You are a campaign strategist. Given a user's plain-English prompt, generate a complete campaign draft.

Respond in JSON format (no markdown, no backticks):
{
  "id": "camp_<random>",
  "prompt": "the original prompt",
  "preview": {
    "name": "short campaign name",
    "segment": {
      "filters": [{ "field": "segment", "operator": "equals", "value": "HOT" }],
      "estimatedLeads": number
    },
    "channels": ["WHATSAPP"],
    "message": "full campaign message text with {placeholders} for personalization",
    "schedule": { "start": "ISO date", "end": "ISO date", "timezone": "Asia/Kolkata" },
    "budget": number_in_INR,
    "predictedROI": "e.g. 180%"
  },
  "status": "draft",
  "createdAt": "ISO date"
}

Rules:
- Keep message concise and actionable (under 500 chars)
- Use {name} and {business_name} as placeholders
- Budget should be realistic (500-50000 INR range)
- Estimated leads should be realistic (10-500 range)
- Predicted ROI should be reasonable (50-300%)`,
        },
        { role: 'user', content: body.prompt },
      ],
      max_tokens: 1000,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content || '{}';
    const draft = JSON.parse(content);
    return draft;
  }

  @Get()
  async list() {
    return [];
  }
}
