import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MemoryService } from './memory.service';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class ReflexionService {
  private readonly logger = new Logger(ReflexionService.name);
  private client: OpenAI;

  constructor(
    private prisma: PrismaService,
    private memory: MemoryService,
    private config: ConfigService,
  ) {
    const apiKey = this.config.get<string>('DEEPSEEK_API_KEY');
    const baseURL = this.config.get<string>('DEEPSEEK_BASE_URL') || 'https://api.deepseek.com/v1';
    if (apiKey) {
      this.client = new OpenAI({ apiKey, baseURL });
    }
  }

  async reflectOnOutcome(tenantId: string, outcomeType: string, entityId: string) {
    const trajectory = await this.buildTrajectory(tenantId, outcomeType, entityId);
    if (!trajectory || trajectory.length < 2) {
      this.logger.debug(`Reflexion: insufficient trajectory for ${outcomeType}:${entityId}`);
      return null;
    }

    const outcome = await this.getOutcome(tenantId, outcomeType, entityId);
    const reflection = await this.generateReflection(trajectory, outcome);

    const perspectives = await this.generateMultiPerspectives(trajectory, reflection);

    let candidateRule: string | null = null;
    if (reflection.lesson && reflection.success === false) {
      candidateRule = await this.extractProceduralRule(trajectory, reflection, perspectives);
    }

    await this.memory.logReflexion(tenantId, {
      outcomeType,
      entityId,
      trajectory,
      reflection: reflection.narrative,
      candidateRule,
      perspectives,
    });

    if (candidateRule) {
      await this.memory.proposeRule(
        tenantId,
        candidateRule,
        reflection.lesson || 'Learned from experience',
        this.categorizeRule(outcomeType),
      );
      this.logger.log(`Reflexion: proposed rule "${candidateRule.slice(0, 80)}..." for ${outcomeType}:${entityId}`);
    }

    return { reflection, candidateRule, perspectives };
  }

  private async buildTrajectory(tenantId: string, outcomeType: string, entityId: string): Promise<any[]> {
    const actions: any[] = [];

    if (outcomeType === 'lead_converted' || outcomeType === 'lead_lost') {
      const events = await this.prisma.systemEvent.findMany({
        where: {
          leadId: entityId,
          type: { startsWith: 'mikey.' },
        },
        orderBy: { createdAt: 'asc' },
        take: 50,
      });
      for (const e of events) {
        actions.push({
          time: e.createdAt.toISOString(),
          type: e.type,
          payload: e.payload,
        });
      }

      const messages = await this.prisma.conversationMessage.findMany({
        where: { leadId: entityId },
        orderBy: { createdAt: 'asc' },
        take: 30,
        select: { direction: true, text: true, createdAt: true },
      });
      for (const m of messages) {
        actions.push({
          time: m.createdAt.toISOString(),
          type: `message_${m.direction?.toLowerCase() || 'unknown'}`,
          payload: { text: (m.text || '').slice(0, 200) },
        });
      }
    }

    if (outcomeType === 'campaign_result') {
      const campaign = await this.prisma.campaign.findUnique({
        where: { id: entityId },
        include: { leads: true },
      });
      if (campaign) {
        const active = campaign.active ? 'active' : 'inactive';
        actions.push({ time: campaign.createdAt.toISOString(), type: 'campaign_created', payload: { name: campaign.name } });
        actions.push({ time: campaign.updatedAt.toISOString(), type: 'campaign_result', payload: { leadsCount: campaign.leads?.length || 0, active } });
      }
    }

    if (outcomeType === 'booking_outcome') {
      const booking = await this.prisma.booking.findUnique({ where: { id: entityId } });
      if (booking) {
        actions.push({ time: booking.createdAt.toISOString(), type: 'booking_created', payload: { status: booking.status } });
        actions.push({ time: booking.updatedAt.toISOString(), type: 'booking_status', payload: { status: booking.status } });
      }
    }

    return actions.sort((a, b) => a.time.localeCompare(b.time));
  }

  private async getOutcome(tenantId: string, outcomeType: string, entityId: string): Promise<string> {
    if (outcomeType === 'lead_converted') return 'The lead was successfully converted.';
    if (outcomeType === 'lead_lost') return 'The lead was lost or marked as unqualified.';
    if (outcomeType === 'campaign_result') {
      const campaign = await this.prisma.campaign.findUnique({
        where: { id: entityId },
        select: { active: true, name: true },
      });
      return campaign ? `Campaign '${campaign.name}' active: ${campaign.active}` : 'Campaign completed.';
    }
    if (outcomeType === 'booking_outcome') {
      const booking = await this.prisma.booking.findUnique({
        where: { id: entityId },
        select: { status: true },
      });
      return booking ? `Booking finished with status: ${booking.status}` : 'Booking completed.';
    }
    return 'Outcome recorded.';
  }

  private async generateReflection(trajectory: any[], outcome: string): Promise<{ narrative: string; lesson: string; success: boolean }> {
    if (!this.client) {
      return { narrative: 'No LLM available for reflection.', lesson: '', success: true };
    }

    const trajectorySummary = trajectory.map(t => `[${t.type}] ${JSON.stringify(t.payload)}`).join('\n');

    try {
      const response = await this.client.chat.completions.create({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: `You are a reflective AI analyzing your own past actions. Given a sequence of actions and an outcome, write:
1. A natural-language post-mortem (2-3 sentences) explaining what happened and why.
2. A single concrete lesson learned (1 sentence).
3. Whether this was a success (true) or failure (false).

Respond in JSON: {"narrative": "...", "lesson": "...", "success": true/false}`,
          },
          {
            role: 'user',
            content: `Actions taken:\n${trajectorySummary}\n\nOutcome: ${outcome}`,
          },
        ],
        max_tokens: 400,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content || '{}';
      return JSON.parse(content);
    } catch (err: any) {
      this.logger.warn(`Reflexion generation failed: ${err.message}`);
      return { narrative: 'Reflection unavailable.', lesson: '', success: true };
    }
  }

  private async generateMultiPerspectives(trajectory: any[], reflection: { narrative: string; lesson: string; success: boolean }): Promise<any> {
    if (!this.client) {
      return { skeptic: 'No perspectives available.', optimizer: 'No perspectives available.' };
    }

    const trajectorySummary = trajectory.map(t => `[${t.type}] ${JSON.stringify(t.payload)}`).join('\n');

    try {
      const response = await this.client.chat.completions.create({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: `You are a multi-perspective analysis system. Given a trajectory and reflection, analyze from two angles:

1. **Skeptic**: What could go wrong? What assumptions might be incorrect? What blind spots exist?
2. **Optimizer**: How could this be done better? What specific improvement would yield the biggest gain?

Respond in JSON: {"skeptic": "...", "optimizer": "..."}`,
          },
          {
            role: 'user',
            content: `Trajectory:\n${trajectorySummary}\n\nReflection: ${reflection.narrative}\nLesson: ${reflection.lesson}`,
          },
        ],
        max_tokens: 400,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content || '{}';
      return JSON.parse(content);
    } catch {
      return { skeptic: 'Analysis unavailable.', optimizer: 'Analysis unavailable.' };
    }
  }

  private async extractProceduralRule(trajectory: any[], reflection: any, perspectives: any): Promise<string | null> {
    if (!this.client) return null;

    const trajectorySummary = trajectory.map(t => `[${t.type}] ${JSON.stringify(t.payload)}`).join('\n');

    try {
      const response = await this.client.chat.completions.create({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: `You extract actionable procedural rules from past experiences. Given a trajectory, outcome, and multi-perspective analysis, produce a single concrete rule that would improve future outcomes.

The rule must be:
- Specific and actionable ("When X happens, do Y")
- Grounded in the trajectory evidence
- General enough to apply to similar future situations

Respond with just the rule text, no JSON, no explanation.`,
          },
          {
            role: 'user',
            content: `Trajectory:\n${trajectorySummary}\n\nReflection: ${reflection.narrative}\nLesson: ${reflection.lesson}\n\nSkeptic: ${perspectives?.skeptic || ''}\nOptimizer: ${perspectives?.optimizer || ''}`,
          },
        ],
        max_tokens: 200,
      });

      return response.choices[0]?.message?.content?.trim() || null;
    } catch {
      return null;
    }
  }

  private categorizeRule(outcomeType: string): string {
    const map: Record<string, string> = {
      lead_converted: 'messaging',
      lead_lost: 'general',
      campaign_result: 'follow_up',
      booking_outcome: 'pricing',
    };
    return map[outcomeType] || 'general';
  }

  async getReflexionStats(tenantId: string) {
    const logs = await this.prisma.mikeyReflexionLog.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    const total = logs.length;
    const withRules = logs.filter(l => l.candidateRule).length;
    const byType: Record<string, number> = {};
    for (const l of logs) {
      byType[l.outcomeType] = (byType[l.outcomeType] || 0) + 1;
    }
    return { total, withRules, byType, recentLogs: logs.slice(0, 10) };
  }
}
