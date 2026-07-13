import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { KhojClientService } from '../khoj-client/khoj-client.service';
import { TimelineService } from '../timeline/timeline.service';
import { EventsService } from '../events/events.service';

@Injectable()
export class MarketMonitorService implements OnApplicationBootstrap {
  private readonly logger = new Logger(MarketMonitorService.name);
  private setupDone = false;

  constructor(
    private khoj: KhojClientService,
    private timeline: TimelineService,
    private events: EventsService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (this.setupDone) return;
    const healthy = await this.khoj.health();
    if (!healthy) {
      this.logger.warn('Khoj not available, skipping market monitor setup');
      return;
    }

    await this.setupAgent();
    await this.setupAutomations();
    this.setupDone = true;
    this.logger.log('Market Monitor fully initialized');
  }

  private async setupAgent(): Promise<void> {
    try {
      const existing = await this.khoj.listAgents();
      const already = existing.find((a) => a.name === 'Market Intelligence Analyst');
      if (already) {
        this.logger.log('Market Monitor agent already exists');
        return;
      }

      await this.khoj.createAgent({
        name: 'Market Intelligence Analyst',
        persona: 'Senior market intelligence analyst specializing in competitor tracking and industry trend analysis',
        instructions: `Monitor competitors, industry trends, and market shifts.
For each scan: identify key changes, new product launches, pricing changes, funding announcements, leadership changes.
Summarize findings concisely. Flag critical changes (competitor launch, price drop, funding round) with URGENT priority.
Always include source URLs. Compare findings with previous scans to identify trends over time.`,
        tools: ['web_search', 'web_scrape', 'deep_research'],
        knowledgeSources: [],
      });
      this.logger.log('Market Monitor agent created');
    } catch (err: any) {
      this.logger.warn(`Failed to create Market Monitor agent: ${err.message}`);
    }
  }

  private async setupAutomations(): Promise<void> {
    const automations = [
      {
        name: 'Weekly Competitor Deep Scan',
        cron: '0 8 * * 1',
        query: 'Scan top 3 competitors. Check for: new product launches, pricing changes, funding rounds, hiring spikes, marketing campaigns, partnership announcements.',
      },
      {
        name: 'Daily Industry News',
        cron: '0 8 * * *',
        query: 'Scan industry news for: regulatory changes, market trends, new technologies, major partnerships, analyst reports relevant to our industry.',
      },
      {
        name: 'Urgent Mention Check',
        cron: '0 */4 * * *',
        query: 'Quick scan: any urgent mentions of our company, competitors, or industry keywords. Flag anything requiring immediate attention.',
      },
    ];

    const existing = await this.khoj.listAutomations();
    for (const auto of automations) {
      const already = existing.find((a) => a.name === auto.name);
      if (already) {
        this.logger.log(`Automation "${auto.name}" already exists`);
        continue;
      }
      await this.khoj.createAutomation({
        name: auto.name,
        cronSchedule: auto.cron,
        agentSlug: 'market-intelligence-analyst',
        query: auto.query,
      });
      this.logger.log(`Automation "${auto.name}" created`);
    }
  }

  async handleIntelReport(report: { findings: any[]; urgency: string; source: string; summary: string; timestamp: string }): Promise<void> {
    this.logger.log(`Market intel received: ${report.summary.slice(0, 80)}`);

    await this.timeline.add({
      type: 'market_intel',
      title: `Market Intel: ${report.source}`,
      description: report.summary,
      metadata: report as any,
    });

    await this.events.emit({
      type: 'market.intel_received',
      source: 'market-monitor',
      entityType: 'market_intel',
      payload: report,
    });
  }
}
