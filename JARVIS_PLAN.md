# JARVIS — The AI That Runs the Business

## The Core Insight (Why Nobody Has Done This)

Everyone builds AI **bottom-up** — AI as a feature of existing systems (copilot in CRM, agent for leads, workflow automation). You're thinking **top-down**: what does an AI that **runs the business** look like?

| What they build | Example | Limitation |
|---|---|---|
| **AI copilot in CRM** | Salesforce Einstein, HubSpot Breeze | Talks to staff, knows nothing about leads |
| **Autonomous lead agent** | Every AI SDR, Clay | Talks to leads, knows nothing about internal ops |
| **Workflow automation** | n8n, Zapier | No intelligence, just if/then |
| **AI operating system** | SimplAI, Merge | Infrastructure, not intelligence |
| **Self-improving agents** | Meta HyperAgents, ROMA | Academic, no business domain |

> **Nobody has merged all four into one intelligence. That's what makes this novel.**

---

## The Problem Right Now

**Two AIs that don't know each other exist:**

- **Mikey (NestJS/DeepSeek)** — Talks to staff. 20+ tools, permission matrix, guardrails, navigate_ui, explain_flow, rate limits, kill switch. Lives in the CRM backend.
- **Agent Service (Python/LangGraph)** — Talks to leads. Autonomous qualification, 7-stage state machine, idempotency, tool-based conversations. Lives in a Python FastAPI service.

Different languages. Different databases. Different minds. No handoff. No cross-reference. No shared learning. **Two brains in separate jars.**

---

## The Vision: One Mind, Many Voices

```
               ┌──────────────────────────────────┐
               │           JARVIS CORE            │
               │       (Unified Reasoning)        │
               │   DeepSeek — single model, all   │
               │   context, all memory, all goals │
               └──────────────────────────────────┘
                                 │
                ┌────────────────┼────────────────┐
                ▼                ▼                ▼
      ┌───────────────────┐ ┌──────────┐ ┌─────────────────┐
      │ Staff Voice       │ │ Lead     │ │ System          │
      │ (Copilot)         │ │ Voice    │ │ Voice           │
      │ Talk to your team │ │ (Agent)  │ │ Talk to APIs,   │
      │ in widget/page/   │ │ Talk to  │ │ n8n, scoring,   │
      │ toast/banner      │ │ customers│ │ routing, etc.   │
      └───────────────────┘ └──────────┘ └─────────────────┘
```

Jarvis doesn't have separate "modes." **Jarvis decides** which voice to use:
- Lead messages → chats, qualifies, books appointments
- Staff asks question → answers from the same memory
- Jarvis spots a pattern → acts without being asked
- Needs to update scoring → calls the system voice

---

## The 6 Capabilities Nobody Has Built

### 1. Outcome-Driven Autonomy
Everyone builds *"if this happens, do that."* You build: *"increase conversion rate to 20% this month."*
Jarvis plans, executes, measures, adjusts. No if/then. Just goals.

### 2. Cross-Flow Learning
*"What I learned talking to 500 leads"* automatically informs *"how I route leads"* which updates *"what I tell staff."* One lesson propagates everywhere.

```
Lead Conversation (Agent Service)
  → Summary + tactics stored in Khoj memory
  → Staff asks Mikey "how do we handle objection X?"
  → Mikey queries Khoj → finds similar lead conversation → returns tactic
  → Staff uses tactic → wins deal
  → Outcome fed back to Khoj → reinforces winning patterns
```

### 3. Temporal Strategy
*"Leads from Instagram convert better on weekends. I'll route weekend leads to the best closer. Weekdays → prioritize Google Ads leads."*
Jarvis discovers patterns and acts without being told.

### 4. Staff Awareness
*"Priya is killing it with real estate leads. Ravi is better with enterprise. I'll route based on who's hot, not just available."*
Jarvis knows the team better than the manager does.

### 5. Explainable Strategy
Not *"I updated 3 leads."* But:
*"I noticed 12 leads from Google Ads stalled at QUALIFYING. I lowered their scoring threshold by 5 points because historical data shows they convert after day 14, not day 7. I've paused the underperforming LinkedIn campaign. Here's the expected impact."*

### 6. The Meta-Cycle (Self-Improvement)
Jarvis watches its own decisions: *"My re-routing suggestion last week improved close rate by 3%. I'll generalize that pattern."*
It self-improves through measurement.

---

## Existing System (What's Already Built)

| Component | Status | Details |
|---|---|---|
| **Mikey (Copilot Service)** | ✅ Built | 786-line service, 20+ tools, permission matrix, guardrails, navigate_ui, explain_flow, rate limits, kill switch, conversation history |
| **Agent Service (Python)** | ✅ Built | LangGraph state machine (load_context → analyze → ask → qualify → etc.), idempotency, tool-based conversation |
| **Events Service** | ✅ Built | DB-backed event bus, idempotent with dedup |
| **Realtime Gateway** | ⚠️ Stub | Socket.IO skeleton exists, only logs events — no actual push |
| **Notifications** | ✅ Built | In-app + SMS |
| **Scoring Rules** | ✅ Built | Lead scoring logic |
| **Routing Rules** | ✅ Built | Lead routing logic |
| **Lead Reply Watcher** | ✅ Built | Autonomous background agent — watches status changes, inbound replies, writes Mikey-named timeline entries |
| **Nurture Sequences** | ✅ Built | Automated lead nurturing |
| **n8n** | ✅ External | Workflow automation connector |
| **Copilot Frontend** | ✅ Built | React widget, CopilotPage, explain mode player, message streaming |

### Current Mikey vs. What Jarvis Will Be

| Dimension | Current Mikey | Jarvis |
|---|---|---|
| **Trigger** | User types | System events, anomalies, opportunities |
| **Presence** | Widget only | Every page — banners, toasts, inline tooltips, sidebar |
| **Reach** | CRM staff | Staff + leads + system + external |
| **Proactivity** | None | *"Noticed 3 hot leads haven't been contacted in 2 hours"* |
| **Awareness** | None | Watches dashboards, metrics, SLAs, anomalies |
| **Action** | Requires confirmation | Executes routine tasks autonomously (low-risk) |
| **Realtime** | Polling | WebSocket push |
| **Context** | Single conversation | Full system state |
| **Voice** | No | Future: speech in/out |

---

## Khoj as Jarvis's Second Brain

**What Khoj is:** A personal RAG knowledge base — ingest docs, query with AI, schedule research, build agents. 35.7k stars, self-hostable via Docker.

| Need | Filled by Khoj |
|---|---|
| Company knowledge (docs, SOPs, pricing, products) | ✅ Ingests PDF, Markdown, Notion, Word, web |
| Competitor monitoring at intervals | ✅ Built-in scheduled automations (APScheduler + cron) |
| Web research pipeline | ✅ SearXNG + Serper/Exa/Firecrawl |
| Custom agents with personas | ✅ Custom agent builder with instructions + tools |
| Long-term memory for Mikey | ✅ REST API to query via RAG |
| Lead conversation memory | ✅ Memories API for unstructured knowledge |
| Self-hostable / private | ✅ Docker Compose, AGPL license |

### The Architecture

```
          JARVIS BRAIN
    (NestJS Copilot + Python Agent Service)
   Mikey ↔ Agent Service (unified reasoning)
            │
            │ queries via REST API
            ▼
 ┌──────────────────────────────────────────────┐
 │ KHOJ (Second Brain - Sidecar)                │
 │                                              │
 │  ┌────────────────────┐                      │
 │  │ Company Knowledge  │  ← docs, SOPs, pricing, products
 │  ├────────────────────┤                      │
 │  │ Market Intel       │  ← competitor research, ads, news
 │  ├────────────────────┤                      │
 │  │ Lead Memory        │  ← every convo summary, tactic, outcome
 │  ├────────────────────┤                      │
 │  │ Historical Data    │  ← past campaigns, what worked
 │  └────────────────────┘                      │
 │                                              │
 │  ┌────────────────────┐                      │
 │  │ Market Monitor     │  ← scheduled agent: scans competitors
 │  │ Agent              │    every 6h, stores findings
 │  └────────────────────┘                      │
 └──────────────────────────────────────────────┘
```

---

## Full Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                      FRONTEND (React/Vite)                        │
│  ┌───────────┐  ┌────────────────┐  ┌────────────────────────┐  │
│  │ Dashboard │  │ Copilot Widget │  │ Jarvis Command Center  │  │
│  │  Widgets  │  │ (chat, explain)│  │ (status, intel, audit) │  │
│  └─────┬─────┘  └───────┬────────┘  └───────────┬────────────┘  │
└────────┼─────────────────┼───────────────────────┼───────────────┘
         │        Socket.IO (Realtime Events)       │
         │                 │                        │
┌────────┼─────────────────┼───────────────────────┼───────────────┐
│  │     │          BACKEND (NestJS)               │              │
│  ┌─────▼─────────────────▼───────────────────────▼────────────┐ │
│  │              REAL-TIME GATEWAY (Socket.IO)                  │ │
│  │  → auth connections → join rooms → emit events            │ │
│  └────────────────────────────┬────────────────────────────────┘ │
│                               │                                  │
│  ┌────────────────────────────▼────────────────────────────────┐ │
│  │                    EVENTS SERVICE                            │ │
│  │  → persist events (idempotent) → emit to gateway            │ │
│  └────────────────────────────┬────────────────────────────────┘ │
│                               │                                  │
│  ┌───────────┐  ┌────────────▼──────┐  ┌──────────────────────┐ │
│  │  MIKEY    │  │  KHOJ CLIENT      │  │   AGENT SERVICE      │ │
│  │ (Copilot) │──│  Module           │  │   (HTTP bridge)      │ │
│  │ 20+ tools │  │  (REST API wrap)  │  │                      │ │
│  │ guardrails│  │                   │  │                      │ │
│  │ permissions│ │                   │  │                      │ │
│  └───────────┘  └────────┬──────────┘  └──────────┬───────────┘ │
│                          │                         │             │
│  ┌───────────┐           │                         │             │
│  │ JARVIS    │           │                         │             │
│  │ SCHEDULER ├──scans──┘                         │             │
│  │ (patterns,│  for patterns                      │             │
│  │ anomalies)│                                    │             │
│  └───────────┘                                    │             │
└───────────────────────────────────────────────────┼─────────────┘
                                                     │
                           ┌─────────────────────────┴─────────────┐
                           │          AGENT SERVICE (Python)        │
                           │  LangGraph State Machine               │
                           │  Lead qualification → persists to Khoj │
                           │  Objection handling → persists to Khoj │
                           │  Lead profiles → ingests to Khoj       │
                           └─────────────────────────┬──────────────┘
                                                      │
                           ┌──────────────────────────▼──────────────┐
                           │           KHOJ (Sidecar)                │
                           │  ┌──────────────────────────────────┐  │
                           │  │  Chat RAG API ← Mikey queries    │  │
                           │  │  ↕ pgvector                      │  │
                           │  │  Content Ingestion API           │  │
                           │  ├──────────────────────────────────┤  │
                           │  │  Agent System                    │  │
                           │  │  └─ Market Monitor Agent         │  │
                           │  │  └─ Custom query agents          │  │
                           │  ├──────────────────────────────────┤  │
                           │  │  Automation (APScheduler)        │  │
                           │  │  └─ Weekly competitor scan       │  │
                           │  │  └─ Daily industry news scan     │  │
                           │  │  └─ 4-hour urgency check         │  │
                           │  ├──────────────────────────────────┤  │
                           │  │  Memory API                      │  │
                           │  │  Deep Research API (web+code+    │  │
                           │  │    files)                        │  │
                           │  └──────────────────────────────────┘  │
                           │  SearXNG ← Web Search Engine          │
                           │  PostgreSQL + pgvector                 │
                           └───────────────────────────────────────┘
```

---

## The Real Missing Pieces (Gap Analysis)

| What's Missing | Why It Matters | What It Takes |
|---|---|---|
| **Socket.IO wiring** in `realtime.gateway.ts` | Push events to dashboard — no polling | ~1-2 days |
| **Jarvis Scheduler** (background loop) | Scan for patterns, anomalies, opportunities; push proactives | ~3-5 days |
| **Proactive injection points** in dashboard | Mikey banners, suggestion toasts, inline nudges | ~3-4 days |
| **Unified persona** | Merge Copilot + Agent Service into one brain (or shared conversation log) | ~5-7 days |
| **Autonomous action mode** | Execute low-risk actions without confirmation (update scores, send follow-ups, re-assign cold leads) | ~3-5 days |
| **Khoj integration** | Long-term memory, RAG, market monitoring, research | ~5-7 days |
| **Voice interface** | WebRTC + TTS/STT (future phase) | ~2 weeks |

**The insight: Infrastructure is already ~70% there.** Events, notifications, scoring, routing, watchers, permissions, guardrails — all built. What's missing is the **wiring and the unified mind.**

---

## IMPLEMENTATION PLAN — 6 Phases, 17 Steps

### PHASE 1: FOUNDATION — Khoj Sidecar Integration

#### 1.1 Deploy Khoj as a Sidecar Service
**Files**: `docker-compose.yml`, `khoj/.env`
- Add Khoj to docker-compose (pgvector, SearXNG, Khoj server)
- Configure shared PostgreSQL network access
- Set up Khoj API key auth for NestJS to call
- Create `khoj/` env config

#### 1.2 Create NestJS KhojClientModule
**Files**: `backend/src/khoj-client/`
```
khoj-client/
  khoj-client.module.ts
  khoj-client.service.ts       ← Wraps all Khoj REST APIs
  khoj-client.service.spec.ts
  khoj-client.types.ts         ← DTOs/interfaces
  khoj-client.constants.ts     ← API endpoints, config
```
Methods:
- `query(question, opts)` → Khoj chat RAG API
- `ingest(content, type)` → content ingestion API
- `createAgent(config)` → agent creation API
- `createAutomation(schedule, action)` → automation API
- `deepResearch(query)` → research API
- `getMemories()` / `saveMemory(raw)` → memories API

#### 1.3 Ingest CRM Knowledge into Khoj
- Startup: company docs, product info, pricing, FAQ
- On lead/opportunity changes: ingest relevant updates
- On conversation completion: ingest summaries
- Seed with existing conversation history

---

### PHASE 2: UNIFY — Merge Mikey + Agent Service Brains

#### 2.1 Agent Service Feeds Memory into Khoj
**Files**: `agent-service/app/tools.py` or new `agent-service/app/memory.py`
- After every lead conversation → POST summary + transcript to Khoj memories
- After every qualification → POST lead profile to Khoj content
- After every objection handled → POST tactic to Khoj (so Mikey can learn)

#### 2.2 Mikey Queries Khoj for RAG Context
**Files**: `backend/src/copilot/copilot.service.ts`
- Supplement current context-building with Khoj RAG queries
- Staff asks question → Mikey queries Khoj → gets grounded answer from CRM data + lead conversation memory
- Mikey wraps with permission checks, guardrails, formatting

#### 2.3 Unified System Prompt
**Files**: `backend/src/copilot/copilot.service.ts`
- "You are Jarvis — the unified intelligence of this CRM"
- "You have access to Khoj (second brain with company knowledge + lead conversation memory)"
- "You can perform actions (tools), research (Khoj deep research), and learn (Khoj memory)"
- "For critical actions, ask for confirmation. For routine, execute autonomously"
- "Always explain your reasoning when asked"

---

### PHASE 3: AUTONOMY — Scheduled Market & Competitor Monitoring

#### 3.1 Create Market Monitor Agent in Khoj
**Created via Khoj API at runtime**
- Persona: "Market Intelligence Analyst"
- Tools: web research (SearXNG), deep research, file save
- Knowledge: competitor URLs, industry keywords, target segments
- Instructions: monitor competitors, industry trends, market shifts, flag critical changes

#### 3.2 Create Scheduled Automations
- `0 8 * * 1` — Weekly competitor deep scan (Monday 8AM)
- `0 8 * * *` — Daily industry news scan
- `0 */4 * * *` — Fast check for urgent mentions

#### 3.3 Market Intel → CRM Integration
**Files**: `backend/src/khoj-client/khoj-client.service.ts`
- Automation completion → webhook to NestJS
- NestJS creates timeline entries in CRM ("Competitor X launched feature Y")
- NestJS notifies relevant users
- If critical (competitor price drop) → Mikey proactively alerts staff

---

### PHASE 4: REALTIME — Un-stub the Gateway

#### 4.1 Wire Socket.IO Properly
**Files**: `backend/src/realtime/realtime.gateway.ts`
- Implement actual connection handling with auth
- Join rooms per user/organization
- Emit events from the events service
- Handle disconnection, reconnection

#### 4.2 Events Service → Push
**Files**: `backend/src/events/events.service.ts`, `backend/src/realtime/realtime.gateway.ts`
- After events saved → emit to realtime gateway
- Categories: lead_updates, agent_actions, market_intel, system_alerts, copilot_responses

#### 4.3 Frontend Real-time Updates
**Files**: `frontend/src/lib/`, dashboard components
- Socket.IO client in React
- Auto-update lead cards, notifications, copilot responses
- "Jarvis is thinking..." indicators

#### 4.4 Proactive Injection Points
**Files**: Frontend components
- Mikey banner (top of page, important alerts)
- Suggestion toast (bottom-right, non-urgent tips)
- Inline nudge (tooltip-style, contextual)

---

### PHASE 5: INTELLIGENCE — Outcome-Driven Autonomy

#### 5.1 Jarvis Outcome Engine
**Files**: `backend/src/copilot/copilot.service.ts`, new `backend/src/jarvis/`
- Store outcome definitions: qualify lead, schedule demo, update pipeline, research competitor
- Jarvis breaks outcomes into sub-steps using Khoj + tools
- Track progress (DB table: `jarvis_tasks`)
- Outcome spans multiple messages/conversations

#### 5.2 Jarvis Scheduler (Background Loop)
**New**: `backend/src/jarvis/jarvis-scheduler.service.ts`
- Background loop that scans for:
  - **Patterns**: "all leads from Instagram stall at QUALIFYING"
  - **Anomalies**: "conversion rate dropped 15% today"
  - **Opportunities**: "3 hot leads untouched for 2 hours"
  - **SLAs**: "5 leads in NEW status for > 24 hours"
- When found → pushes proactive notification to staff
- Uses Khoj for historical comparison ("this pattern happened before, here's what worked")

#### 5.3 Autonomous Action Mode
- Define risk tiers: low (auto-execute), medium (notify + offer action), high (require confirmation)
- Low-risk: update scores, send follow-ups, re-assign cold leads, adjust nurture timing
- Medium: suggest routing changes, recommend campaign pauses
- High: delete data, change pricing, send external communications
- Audit log all auto-actions

#### 5.4 Guardrails & Confirmation
**Files**: `backend/src/copilot/copilot.service.ts` (already has confirmation system)
- Critical action categories: delete, update pricing, send external comms, change permissions
- Jarvis asks "I'm about to do X. Confirm?"
- Confirmation via UI (existing dialog) or message reply
- Audit log of all confirmed/denied actions

#### 5.5 Explainable Strategy
**Files**: `backend/src/copilot/copilot.service.ts` (already has explain mode)
- Jarvis prepends reasoning for complex actions
- "Here's my thinking: [lead scored X because...]. I recommend [action]. Reason: [explanation based on Khoj sources]."
- Drill-down: "why did you suggest that?" → shows Khoj sources
- Store explanation with every action

#### 5.6 Temporal Strategy Engine
- Track time-based patterns: lead source x day x time → conversion rate
- Auto-discover and adjust routing based on temporal insights
- "Leads from Instagram convert better on weekends → route to best closer"
- "Weekdays → prioritize Google Ads leads"

#### 5.7 Staff Awareness
- Track staff performance per lead type, source, stage
- "Priya kills real estate leads, Ravi better with enterprise → route accordingly"
- Auto-adjust routing rules based on who's hot, not just who's available

---

### PHASE 6: DASHBOARD — Jarvis Command Center

#### 6.1 Jarvis Status Page
**Files**: `frontend/src/pages/JarvisPage.tsx` (new)
- Active Jarvis activities
- Market monitor reports (latest scan summary)
- Recent Jarvis actions (audit log)
- Memory stats (leads ingested, queries answered)
- Khoj connection status

#### 6.2 Outcome Tracking
- Active outcomes Jarvis is working on with progress
- Manual outcome creation: "Jarvis, I want you to [outcome]"
- Outcome history (completed, failed, cancelled)

#### 6.3 Market Intel Feed
- Scrollable feed of intelligence findings
- Filter: competitor, urgency, type, date
- "Why this matters" — Jarvis's analysis
- Actions: "Share with team", "Create task", "Dismiss"

#### 6.4 Proactive Suggestions Panel
- List of current Jarvis suggestions with rationale
- Accept/dismiss per suggestion
- "Jarvis noticed..." history

---

## THE INFRASTRUCTURE REALITY CHECK

### What Already Exists (70% complete)

| Component | Status | Notes |
|---|---|---|
| EventsService | ✅ Done | DB-backed, idempotent event bus |
| NotificationsService | ✅ Done | In-app + SMS |
| ScoringRules | ✅ Done | Lead scoring logic |
| RoutingRules | ✅ Done | Lead routing logic |
| LeadReplyWatcher | ✅ Done | Autonomous background watcher |
| ExplainModePlayer | ✅ Done | Guided walkthroughs |
| Mikey tools (20+) | ✅ Done | navigate_ui, explain_flow, CRUD, etc. |
| Permission matrix | ✅ Done | Per-role, per-tool access control |
| Confirmation guardrails | ✅ Done | Critical action confirmation flow |
| Rate limits / kill switch | ✅ Done | Safety rails |
| Agent Service (LangGraph) | ✅ Done | 7-stage lead qualification |
| n8n automation | ✅ External | Workflow triggers |
| WebSocket gateway | ⚠️ Stub | Skeleton, no actual push |

### What's Missing (30%)

| Component | Effort | Priority |
|---|---|---|
| Socket.IO wiring | 1-2 days | High |
| KhojClientModule | 2-3 days | High |
| Khoj deploy + seed | 1-2 days | High |
| Agent Service → Khoj memory | 1-2 days | High |
| Mikey → Khoj RAG queries | 1-2 days | High |
| Unified system prompt | 0.5 days | High |
| Market Monitor agent + automations | 2-3 days | Medium |
| Market intel → CRM webhook | 1-2 days | Medium |
| Jarvis Scheduler (background loop) | 3-5 days | Medium |
| Proactive injection points (UI) | 3-4 days | Medium |
| Autonomous action mode | 3-5 days | Medium |
| Outcome engine | 3-5 days | Medium |
| Temporal strategy engine | 3-5 days | Low |
| Staff awareness engine | 3-5 days | Low |
| Jarvis Command Center UI | 4-5 days | Low |
| Voice interface | 2 weeks | Future |

---

## KEY INTERFACES

### KhojClientService (NestJS)
```typescript
interface KhojClientService {
  query(question: string, opts?: QueryOpts): Promise<KhojQueryResponse>;
  ingest(file: Buffer | string, type: ContentType): Promise<void>;
  ingestLeadProfile(leadId: string, data: any): Promise<void>;
  getMemories(): Promise<KhojMemory[]>;
  saveMemory(raw: string): Promise<void>;
  createAgent(config: AgentConfig): Promise<KhojAgent>;
  listAgents(): Promise<KhojAgent[]>;
  createAutomation(config: AutomationConfig): Promise<KhojAutomation>;
  listAutomations(): Promise<KhojAutomation[]>;
  deepResearch(query: string): Promise<ResearchResult>;
}
```

### Agent Service → Khoj Memory Contract
```
After each lead conversation:
  POST /api/content → lead transcript, summary, outcome
  POST /api/memories → tactic used, objection handling, lesson learned
```

### Khoj Automation → NestJS Webhook
```
On completion:
  POST /api/webhooks/khoj/market-intel
  Body: { findings, urgency, source, timestamp }
```

---

## METRICS OF SUCCESS

1. Mikey answers questions with Khoj knowledge (not just static prompts)
2. Agent Service tactics appear in Mikey's responses automatically
3. Market monitor delivers weekly reports without any manual effort
4. Staff sees real-time updates without refreshing
5. Jarvis autonomously breaks down outcomes into steps
6. Jarvis proactively suggests actions ("noticed 3 hot leads untouched...")
7. Explainable reasoning is visible and useful to staff
8. Cross-flow learning loop works: lead convo → Khoj → Mikey → staff wins
9. Temporal patterns auto-discovered and acted upon
10. Staff routing adapts to who's performing best on what

---

## IMPLEMENTATION ORDER

| Step | Phase | What | Depends On | Est. Effort |
|---|---|---|---|---|
| 1 | P1 | Deploy Khoj docker-compose | — | 1-2 days |
| 2 | P1 | Create NestJS KhojClientModule | 1 | 2-3 days |
| 3 | P1 | Seed initial CRM knowledge into Khoj | 2 | 0.5 days |
| 4 | P2 | Agent Service → Khoj memory after convos | 2 | 1-2 days |
| 5 | P2 | Mikey queries Khoj for RAG | 2 | 1-2 days |
| 6 | P2 | Unified system prompt | 5 | 0.5 days |
| 7 | P3 | Create Market Monitor Khoj agent | 2 | 1 day |
| 8 | P3 | Create scheduled automations | 2 | 1 day |
| 9 | P3 | Market intel → CRM webhook integration | 2 | 1-2 days |
| 10 | P4 | Wire Socket.IO properly | — | 1-2 days |
| 11 | P4 | Events → push via gateway | 10 | 0.5 days |
| 12 | P4 | Frontend real-time subscriptions | 11 | 1-2 days |
| 13 | P4 | Proactive injection points (UI) | 12 | 3-4 days |
| 14 | P5 | Jarvis Scheduler (background loop) | 5 | 3-5 days |
| 15 | P5 | Outcome engine | 6 | 3-5 days |
| 16 | P5 | Autonomous action mode | 14+15 | 3-5 days |
| 17 | P5 | Guardrails enhancement | 6 | 1-2 days |
| 18 | P5 | Explainable strategy | 6 | 1-2 days |
| 19 | P5 | Temporal strategy engine | 14 | 3-5 days |
| 20 | P5 | Staff awareness engine | 14 | 3-5 days |
| 21 | P6 | Jarvis Command Center UI | 15 | 4-5 days |
| 22 | Future | Voice interface | 21 | ~2 weeks |

---

## THE CORE INSIGHT (Repeated for Emphasis)

**You have all the Lego bricks.** Nobody has assembled them into one intelligence.

The question isn't *"what more can we add."* It's: **what if we let Mikey use ALL of it — including the agent service, Khoj, events, scoring, routing, n8n — as its own nervous system?**

Mikey already has the tools. Give it:
1. Persistent outcome memory (Khoj)
2. Business goals as prompts
3. Permission to act autonomously on low-risk decisions
4. The lead-facing agent service as one of its output channels
5. System-wide awareness (not just chat context)

Then Mikey becomes Jarvis. Not because you added features. **Because you removed the walls.**
