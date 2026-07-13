import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { KhojClientService } from './khoj-client.service';

@Injectable()
export class KhojSeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(KhojSeedService.name);
  private seeded = false;

  constructor(private khoj: KhojClientService) {}

  async onApplicationBootstrap(): Promise<void> {
    if (this.seeded) return;
    const healthy = await this.khoj.health();
    if (!healthy) {
      this.logger.warn('Khoj not available, skipping seed. Will retry on next restart.');
      return;
    }
    this.logger.log('Seeding CRM knowledge into Khoj...');
    await this.seedCompanyKnowledge();
    await this.seedProductInfo();
    await this.seedProcessGuides();
    this.seeded = true;
    this.logger.log('Khoj seed complete');
  }

  private async seedCompanyKnowledge(): Promise<void> {
    const knowledge = [
      {
        title: 'Company Overview',
        content: `This is a lead automation CRM platform that helps businesses capture, qualify, and convert leads.
Key features: Lead management, conversation tracking, appointment booking, nurture sequences, scoring rules, routing rules, campaign management, analytics, and reporting.
The platform supports multi-tenant operation with per-tenant business settings, goals, and compliance rules.`,
      },
      {
        title: 'System Architecture',
        content: `The system consists of:
- NestJS backend (REST API, WebSocket gateway, background jobs via BullMQ/Redis)
- React dashboard (Vite build)
- Python LangGraph agent service (autonomous lead conversations)
- PostgreSQL database (main data store)
- Redis (queues, caching, pub/sub)
- n8n (workflow automation)
- Khoj (knowledge base and RAG)`,
      },
    ];
    for (const doc of knowledge) {
      await this.khoj.ingestText(doc.content);
      this.logger.debug(`Seeded: ${doc.title}`);
    }
  }

  private async seedProductInfo(): Promise<void> {
    const products = [
      {
        title: 'Core Platform',
        content: `The core CRM platform includes:
- Lead Management: capture, qualify, score, route, and convert leads
- Conversation Hub: multi-channel messaging (email, SMS, Telegram, WhatsApp)
- Appointment Booking: scheduling with calendar sync
- Nurture Sequences: automated multi-step follow-ups
- Campaign Management: create, launch, track marketing campaigns
- Analytics Dashboard: real-time metrics, conversion funnels, source analysis
- Scoring Rules: configurable lead scoring based on behavior, source, engagement
- Routing Rules: auto-assign leads to agents based on skills, load, source`,
      },
    ];
    for (const doc of products) {
      await this.khoj.ingestText(doc.content);
      this.logger.debug(`Seeded: ${doc.title}`);
    }
  }

  private async seedProcessGuides(): Promise<void> {
    const guides = [
      {
        title: 'Lead Qualification Process',
        content: `Lead qualification follows these stages:
1. NEW - Lead captured, no contact yet
2. CONTACTED - Initial outreach made
3. QUALIFYING - Agent Service engages in qualification conversation
4. QUALIFIED - Lead meets qualification criteria
5. CONVERTED - Lead became a customer
6. LOST - Lead did not convert

Scoring rules can auto-escalate leads based on:
- Source quality (Google Ads > organic > social)
- Engagement level (email open rate, response time)
- Profile completeness
- Industry segment
- Budget range`,
      },
      {
        title: 'Agent Service Behavior',
        content: `The Agent Service is an autonomous AI that talks to leads via Telegram, WhatsApp, or web chat.
It uses a LangGraph state machine with these stages:
1. load_context - Load lead history and business context
2. analyze_lead - Assess lead needs and fit
3. ask_questions - Gather qualifying information
4. provide_info - Share relevant product/service info
5. handle_objections - Address concerns
6. qualify - Determine if lead is qualified
7. escalate - Pass hot leads to human staff

The agent learns from conversations and stores tactics back to Khoj memory.`,
      },
    ];
    for (const doc of guides) {
      await this.khoj.ingestText(doc.content);
      this.logger.debug(`Seeded: ${doc.title}`);
    }
  }
}
