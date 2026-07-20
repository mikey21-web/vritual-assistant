import { Controller, Post, Get, Param, Body, Req, UseGuards, Query, Res } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { VoiceAgentService } from './voice-agent.service';
import { MoonshineService } from '../shared/moonshine.service';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';

@Controller('voice-agent')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VoiceAgentController {
  constructor(
    private service: VoiceAgentService,
    private moonshine: MoonshineService,
  ) {}

  @Post('call/:leadId')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT')
  async callLead(@Param('leadId') leadId: string, @Req() req: any) {
    return this.service.callLead(leadId, req.user.sub);
  }

  @Get('history')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT')
  async history(@Req() req: any, @Query('limit') limit?: string) {
    return this.service.getCallHistory(req.user.tenantId, limit ? parseInt(limit) : 20);
  }

  @Get('tts')
  async tts(@Query('text') text: string, @Res() res: Response) {
    if (!text) return res.status(400).json({ error: 'no text' });
    try {
      const audio = await this.moonshine.tts(text);
      res.set('Content-Type', 'audio/wav');
      res.send(audio);
    } catch {
      res.status(500).json({ error: 'TTS failed' });
    }
  }
}
