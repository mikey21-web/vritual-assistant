import { Controller, Post, Get, Param, Req, UseGuards, Query, Res } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { VoiceAgentService } from './voice-agent.service';
import { PiperTtsService } from '../shared/piper-tts.service';
import { Response } from 'express';

@Controller('voice-agent')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VoiceAgentController {
  constructor(
    private service: VoiceAgentService,
    private piper: PiperTtsService,
  ) {}

  @Get('tts')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT')
  async tts(@Query('text') text: string, @Query('lang') lang: string, @Res() res: Response) {
    if (!text) return res.status(400).json({ error: 'no text' });
    try {
      const audio = await this.piper.speak(text, lang || 'te');
      res.set({ 'Content-Type': 'audio/x-wav', 'Content-Length': audio.length.toString() });
      res.send(audio);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }

  @Post('call/:leadId')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT')
  async callLead(@Param('leadId') leadId: string, @Req() req: any, @Query('lang') lang?: string) {
    return this.service.callLead(leadId, req.user.sub, lang || 'en');
  }

  @Get('history')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT')
  async history(@Req() req: any, @Query('limit') limit?: string) {
    return this.service.getCallHistory(req.user.tenantId, limit ? parseInt(limit) : 20);
  }
}
