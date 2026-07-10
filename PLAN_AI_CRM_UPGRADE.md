# DeploySafe CRM — AI-Powered CRM Upgrade Plan

**Audience:** This document is written for an AI coding agent (DeepSeek) that will implement the
work. Follow it literally. Do not invent alternate file names, do not skip steps, do not
"improve" scope beyond what's written. If a step is ambiguous, prefer the smallest change that
satisfies the acceptance criteria for that step.

**Repo root:** `virtual assisant/` (yes, that's really the folder name).
Sub-projects you will touch:
- `backend/` — NestJS + Prisma, PostgreSQL. Single-tenant (one `Tenant` row exists but there is
  no multi-tenant routing to build — do not add tenant-switching UI).
- `dashboard-v2/` — React frontend (Vite). Pages live in `dashboard-v2/src/pages/`.
- `agent-service/` — Python LangGraph agent that talks to **leads** over WhatsApp/Telegram. This
  is the *customer-facing* bot. Do NOT confuse it with the new *internal* CRM Copilot in Part 4 —
  they are separate systems with separate tool sets.

Work through the parts **in order**: Part 1 → Part 2 → Part 3 → Part 4. Each part ends with a
Prisma migration (if schema changed), backend build (`npm run build` in `backend/`), and frontend
build (`npm run build` in `dashboard-v2/`) that must pass before moving to the next part.

Run `npx prisma generate` in `backend/` after any schema.prisma change, before writing code that
depends on the new types.

---

## Verified codebase conventions (READ FIRST — these are facts checked against the real code, not assumptions)

**These override any conflicting instinct you have. Follow them exactly.**

1. **Authorization is done with decorators, not a guard-checking-a-matrix.** Every controller
   applies `@UseGuards(JwtAuthGuard, RolesGuard)` at the class level and `@Roles('OWNER',
   'ADMIN', ...)` at the method level. The current user is on `req.user` (`req.user.sub` is the
   user id, `req.user.role` is the role). Canonical example — copy this exact shape for every new
   controller:
   ```ts
   import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
   import { JwtAuthGuard } from '../auth/jwt-auth.guard';
   import { RolesGuard } from '../auth/roles.guard';
   import { Roles } from '../auth/roles.decorator';

   @Controller('tickets')
   @UseGuards(JwtAuthGuard, RolesGuard)
   @ApiBearerAuth()
   export class TicketsController {
     constructor(private service: TicketsService) {}

     @Get()
     @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'SUPPORT_AGENT', 'VIEWER')
     findAll(@Query() q: TicketQueryDto) { return this.service.findAll(q); }

     @Post()
     @Roles('OWNER', 'ADMIN', 'MANAGER', 'SUPPORT_AGENT')
     create(@Body() d: CreateTicketDto, @Req() req) { return this.service.create(d, req.user.sub); }
   }
   ```
   `PERMISSION_MATRIX` in `permissions.matrix.ts` is a secondary/reference map — still add your new
   keys to it for consistency, but the thing that actually enforces access is the `@Roles(...)`
   decorator on each method. The role list in `@Roles(...)` must match the roles you put in the
   matrix key.

2. **Roles enum values (exact strings):** `OWNER`, `ADMIN`, `MANAGER`, `SALES_AGENT`,
   `SUPPORT_AGENT`, `VIEWER`.

3. **Realtime updates already exist.** `backend/src/realtime/realtime.gateway.ts` exposes
   `RealtimeGateway.emit(event: string, payload: any)` (gated by a `REALTIME_ENABLED` config).
   Existing events include `lead:new`, `lead:updated`, `lead:scored`, `conversation:new`. Inject
   `RealtimeGateway` and call `emit(...)` after any mutation the UI should reflect live (see the
   per-part "Realtime" notes below). The frontend already has a socket client consuming these —
   find it (grep `dashboard-v2/src` for `socket` / `io(` / the existing `lead:new` listener) and
   add listeners for your new events the same way; do not stand up a second socket connection.

4. **DeepSeek is the configured LLM.** Env vars (reuse these exact names, already used by
   `agent-service`): `DEEPSEEK_API_KEY`, `DEEPSEEK_BASE_URL` (default `https://api.deepseek.com/v1`),
   and model `deepseek-chat` (agent-service reads it as `AGENT_MODEL`). Add these to `backend/.env`
   and to the Nest `ConfigModule` schema (check `backend/src/config/` for how existing env vars are
   registered and follow that). DeepSeek's API is OpenAI-compatible.

5. **Installed deps you can rely on / must add:**
   - Backend HTTP: `@nestjs/axios` is installed — use `HttpService` for outbound calls (WhatsApp,
     webhooks). No `openai`/`langchain` in the backend yet.
   - For Part 4 (copilot tool-calling): add the `openai` npm package to `backend/`
     (`npm i openai` in `backend/`) and point its client at `DEEPSEEK_BASE_URL` with
     `DEEPSEEK_API_KEY` — do NOT add LangChain/LangGraph to the Node backend.
   - Frontend has NO drag-and-drop lib and NO markdown lib installed. For Part 1 add
     `@dnd-kit/core` + `@dnd-kit/sortable` to `dashboard-v2/` (`npm i @dnd-kit/core
     @dnd-kit/sortable`). For Part 3's KB editor, use a plain `<textarea>` — do NOT add a markdown
     lib.

6. **Existing leads query params (do not invent new ones):** `GET /leads` already accepts
   `status`, `segment`, `source`, `campaignId`, `assignedAgentId`, `search`, plus pagination
   (`PaginationDto`). The kanban board (Part 1) and copilot `search_leads` (Part 4) must reuse
   these — do not add parallel query params.

---

## Part 1 — Real Sales Pipeline (Kanban board)

### Problem
`PipelineStage` (backend/prisma/schema.prisma:880) exists as a standalone config model but has
**no relation to `Lead`**. Pipeline progression today is just the `LeadStatus` enum
(schema.prisma:53). There is no drag-and-drop kanban UI — `CRMPage.tsx` is an external CRM
field-mapping page, not a pipeline board.

### Decision
Do NOT replace `LeadStatus`. Too much of the codebase (automation rules, scoring, nurture steps,
agent-service tools.py `update_status`) keys off `LeadStatus`. Instead, make `PipelineStage` a
**customizable visual layer on top of LeadStatus**: each `PipelineStage` maps to one `LeadStatus`
value, stages are orderable/colorable, and the kanban board groups leads by their `status` into
the matching stage column.

### 1.1 Schema changes (`backend/prisma/schema.prisma`)
Add a field to `PipelineStage` linking it to a `LeadStatus`:

```prisma
model PipelineStage {
  id          String     @id @default(uuid())
  name        String
  status      LeadStatus @unique   // NEW FIELD — one stage per status value
  order       Int        @default(0)
  color       String     @default("#6b7280")
  isDefault   Boolean    @default(false)
  isEnd       Boolean    @default(false)
  active      Boolean    @default(true)
  createdAt   DateTime   @default(now())

  @@map("pipeline_stages")
}
```

Create migration: `npx prisma migrate dev --name pipeline_stage_status_link` in `backend/`.

Add a seed step (edit `backend/prisma/seed.ts`, and `seed-mock.ts` if it also seeds pipeline
data) that upserts one `PipelineStage` row per `LeadStatus` enum value in this default order,
so every install has a working board out of the box:

```
1  NEW                  #6b7280
2  CONTACTED            #3b82f6
3  ENGAGED              #8b5cf6
4  QUALIFYING           #a855f7
5  QUALIFIED            #eab308
6  PROPOSAL_SENT        #f97316
7  APPOINTMENT_BOOKED   #06b6d4
8  CONVERTED (isEnd)    #22c55e
9  LOST (isEnd)         #ef4444
10 COLD                 #94a3b8
11 SPAM (isEnd)         #64748b
```

### 1.2 Backend — extend `advanced-features` module (this is where `PipelineStage` CRUD
currently lives — confirm by grepping `backend/src/advanced-features/` for `PipelineStage`
before adding a new module; reuse the existing controller/service if found instead of creating a
duplicate).

Add/confirm these endpoints. Apply `@Roles(...)` per the verified convention above — read methods
get `['OWNER','ADMIN','MANAGER','SALES_AGENT','SUPPORT_AGENT','VIEWER']`; write/reorder methods get
`['OWNER','ADMIN','MANAGER']`. Reuse the existing `advanced:read`/`advanced:write` matrix keys
(`permissions.matrix.ts:118-119`).

- `GET /pipeline-stages` — list active stages ordered by `order`. Response contract:
  ```json
  [{ "id": "...", "name": "New", "status": "NEW", "order": 1, "color": "#6b7280",
     "isEnd": false, "count": 12 }]
  ```
  where `count` = number of non-deleted leads with `status` = that stage (one `groupBy` on
  `Lead.status`, then map onto stages; stages with zero leads still appear with `count: 0`).
- `PATCH /pipeline-stages/reorder` — body `{ "stageIds": ["id1","id2",...] }` (new order
  top-to-bottom). Update each stage's `order` to its index in a single `prisma.$transaction`.
- `PATCH /pipeline-stages/:id` — body may contain `name`, `color`, `active`. Do NOT allow editing
  `status` (it's the immutable link to the enum).
- `PATCH /leads/:id/move-stage` — body `{ "status": "<LeadStatus>" }`. Validate `status` is a real
  `LeadStatus` enum value (reject with 400 otherwise). This must call the **same** internal method
  the existing `PATCH /leads/:id` status path uses (open `backend/src/leads/leads.service.ts`, find
  the method `update()` calls when `status` changes — do not guess, read it), so moving a card
  triggers the identical side effects (timeline entry, automation event emission,
  `qualifiedAt`/`convertedAt` stamping). Do not duplicate that logic. Return the updated lead.
  **Realtime:** after a successful move, `RealtimeGateway.emit('lead:updated', updatedLead)` (the
  existing status path may already emit this — if so, don't double-emit).

### 1.3 Frontend — new Kanban board
Do not overwrite `LeadsPage.tsx` (it's the existing table/list view — leave it as-is and keep its
route). Add a new page `dashboard-v2/src/pages/PipelinePage.tsx`:

- Fetch `GET /pipeline-stages` on mount → render one column per active stage, ordered by `order`.
- Fetch leads per column via the existing leads list endpoint filtered by `status` (check
  `backend/src/leads/leads.controller.ts` for existing query params like `?status=`) — do not add
  a new leads endpoint just for this.
- Each lead renders as a small card: contact name, score, segment badge, assigned agent avatar/
  initials, days-in-stage (compute client-side from `updatedAt`).
- Drag-and-drop between columns using `@dnd-kit/core` + `@dnd-kit/sortable` (confirmed NOT
  installed — add them per the conventions section). On drop, optimistically move the card in
  local state, then call `PATCH /leads/:id/move-stage`; on request failure, revert the card to its
  original column and show an error toast (use the app's existing toast/notification pattern —
  grep for how other pages surface errors).
- Subscribe to the `lead:updated` realtime event (per conventions section) and reconcile the board
  when another user moves a card, so two open boards stay in sync.
- Add a "Manage stages" affordance (modal or side panel) that lets an ADMIN/OWNER reorder columns
  (calls the reorder endpoint) and edit stage color/name. Gate this UI behind the same permission
  check pattern used elsewhere in the app (search for how `RulesPage.tsx` checks permissions and
  copy that pattern).
- Add the route in the app's router file (find where `LeadsPage` is registered, likely
  `dashboard-v2/src/App.tsx` or a `routes.tsx`) as `/pipeline`, and add a nav link next to
  "Leads" in the sidebar nav component.

### Acceptance criteria — Part 1
- Visiting `/pipeline` shows columns for every active `PipelineStage`, leads appear in the
  correct column based on current `status`.
- Dragging a lead card to a different column persists (`status` changes, verified by reloading
  the page and the card staying in the new column).
- Existing `LeadsPage.tsx` table view is unchanged and still works.
- `backend` and `dashboard-v2` both build clean.

---

## Part 2 — Complete Integrations (WhatsApp Business API + real outbound/inbound webhooks)

### Problem
Telegram bot + chat widget work. Stripe/Razorpay work. Booking works. What's missing:
1. No native WhatsApp Business Cloud API channel (only generic `MessageChannel.WHATSAPP` enum
   value exists in schema but nothing sends/receives via Meta's API — check
   `backend/src/integrations/` and `backend/src/webhooks/` to confirm before building; if you find
   an existing WhatsApp provider file, extend it instead of creating a new one).
2. `WebhookEvent` model (schema.prisma:795) — confirm whether it's outbound-only (CRM → external
   URL on events) or also supports inbound (external service → CRM). Build whichever direction is
   missing so both exist.

### 2.1 WhatsApp Business Cloud API integration
Add `backend/src/integrations/whatsapp.provider.ts` (or extend existing file if one covers
WhatsApp already):
- Config fields (store in the existing `Integration` model, schema.prisma:719 — check its shape
  first; likely has `type`, `config: Json`, `active` fields already, reuse them, don't add new
  columns unless the existing `config: Json` can't hold `{ phoneNumberId, accessToken,
  webhookVerifyToken, businessAccountId }`).
- `POST /webhooks/whatsapp` — webhook receiver:
  - `GET` variant handles Meta's verification handshake (`hub.mode`, `hub.verify_token`,
    `hub.challenge` query params) — compare token against stored `webhookVerifyToken`, return
    `hub.challenge` as plain text on match.
  - `POST` variant receives inbound messages, creates/updates `Contact` + `Lead` (source =
    `LeadSource.WHATSAPP`) + `ConversationMessage` (channel = `WHATSAPP`, direction = `INBOUND`),
    same pattern the Telegram webhook handler already uses — find that handler (grep for
    `TELEGRAM` in `backend/src/webhooks/` or `backend/src/conversations/`) and mirror its
    structure exactly (contact upsert → lead upsert → message create → trigger automation event
    → notify agent-service if that's how Telegram does it).
- Outbound send: add a `sendWhatsAppMessage(phoneNumber, text, templateId?)` method called from
  wherever the existing send-message flow lives (the same place Telegram/SMS sending is
  dispatched from — likely `backend/src/conversations/conversations.service.ts` or a channel
  router) — add `WHATSAPP` as a case there rather than building a parallel send path.
- Use Meta Graph API `POST https://graph.facebook.com/v20.0/{phoneNumberId}/messages` with bearer
  token from stored config, via `@nestjs/axios` `HttpService`. Body for a free-form text reply:
  ```json
  { "messaging_product": "whatsapp", "to": "<e164_number>",
    "type": "text", "text": { "body": "..." } }
  ```
- **WhatsApp 24-hour window gotcha (must handle):** Meta only allows free-form text replies within
  24 hours of the customer's last inbound message. Outside that window you must send an
  approved *template* message (`"type": "template"`). Implement this: track the last inbound
  timestamp per contact/lead (you already store inbound `ConversationMessage.createdAt` — query the
  latest inbound WHATSAPP message). If the last inbound was >24h ago (or none exists), the send
  method must send a template (using the `templateId` arg) instead of raw text; if no `templateId`
  is provided in that case, return a clear error the caller can surface ("outside 24h window, a
  template is required") rather than silently failing. Document this in a code comment.
- On send failure from Meta (non-2xx), create a `FailureRecord` (the model/module already exists —
  `backend/src/failures/`) the same way other channel-send failures are recorded, so it shows up in
  `FailuresPage.tsx`.

**Verify Part 2.1:** with a Meta test number configured, (a) message the business number → a Lead +
inbound message appears in `MessagesPage.tsx`; (b) reply from the CRM within 24h → it arrives on
WhatsApp; (c) simulate >24h (temporarily hard-code the window check to always require a template)
→ confirm the code takes the template path.

### 2.2 Zapier-style webhooks (both directions)
First read `backend/src/webhooks/webhooks.service.ts` and `webhooks.controller.ts` in full to
determine what already exists. Then fill only the gaps:

- **Outbound** (CRM → Zapier/any URL): if not already present, add ability for a user to register
  a `WebhookEvent`-style subscription: `{ url, events: AutomationEventType[], secret }`. When a
  matching event fires (reuse the existing `AutomationEvent`/event-bus mechanism used by
  `backend/src/automation/` and `backend/src/rules/` — do not build a second event system), POST a
  JSON payload to `url` with an `X-DeploySafe-Signature` HMAC-SHA256 header (using `secret`) so
  Zapier's "Webhooks by Zapier" trigger can consume it.
- **Inbound** (Zapier/external → CRM): a generic endpoint `POST /webhooks/inbound/:integrationId`
  that accepts an arbitrary JSON payload and, based on the `Integration.config` field-mapping
  (reuse `backend/src/crm-mappings/` if it already implements "map external field → Lead field"
  logic — extend that instead of writing new mapping code), creates/updates a `Lead`. This gives
  Zapier (and n8n, Make, etc.) a generic write-in endpoint without per-vendor code.
- Add both to `IntegrationsPage.tsx`: a "Webhooks" tab showing the outbound webhook subscriptions
  (create/delete, with a "Send test event" button hitting a `POST /webhooks/:id/test` endpoint —
  check if `WebhookPage.tsx` already does this before adding a duplicate UI; if `WebhookPage.tsx`
  already covers outbound webhooks fully, only add the inbound-URL display there instead of
  building a new tab).

### Acceptance criteria — Part 2
- Sending a WhatsApp message to the configured business number creates a Lead + inbound message
  visible in `MessagesPage.tsx`, and a reply sent from the CRM arrives on WhatsApp.
- Registering an outbound webhook for `LEAD_CREATED` and creating a test lead results in a POST
  to a test URL (verify with a local echo endpoint or requestbin-style tool) with a valid HMAC
  signature.
- Posting a JSON payload to `POST /webhooks/inbound/:integrationId` with mapped fields creates a
  Lead.
- Both backend and frontend build clean.

---

## Part 3 — Customer Support Ticketing + Knowledge Base

### Problem
`SlaRule` (schema.prisma:948) exists (SLA timers) and `SUPPORT_AGENT` is a defined role in
`permissions.matrix.ts:14` (already has `leads:read`, `conversations:read/write`,
`timeline:read`, `media:read`), but there is no `Ticket` model, no `KnowledgeBase`/`Article`
model, and no support UI.

### 3.1 Schema additions (`backend/prisma/schema.prisma`)

```prisma
enum TicketStatus {
  OPEN
  IN_PROGRESS
  WAITING_ON_CUSTOMER
  RESOLVED
  CLOSED
}

enum TicketPriority {
  LOW
  MEDIUM
  HIGH
  URGENT
}

model Ticket {
  id            String         @id @default(uuid())
  tenantId      String         @map("tenant_id")
  tenant        Tenant         @relation(fields: [tenantId], references: [id])
  subject       String
  description   String
  status        TicketStatus   @default(OPEN)
  priority      TicketPriority @default(MEDIUM)
  leadId        String?
  lead          Lead?          @relation(fields: [leadId], references: [id])
  contactId     String?
  contact       Contact?       @relation(fields: [contactId], references: [id])
  assignedAgentId String?
  assignedAgent   User?        @relation(fields: [assignedAgentId], references: [id])
  slaRuleId     String?
  slaRule       SlaRule?       @relation(fields: [slaRuleId], references: [id])
  dueAt         DateTime?
  resolvedAt    DateTime?
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt

  comments      TicketComment[]

  @@index([tenantId])
  @@index([status])
  @@index([assignedAgentId])
  @@index([leadId])
  @@map("tickets")
}

model TicketComment {
  id        String   @id @default(uuid())
  ticketId  String
  ticket    Ticket   @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  userId    String?
  user      User?    @relation(fields: [userId], references: [id])
  isInternal Boolean @default(true)   // false = visible to customer via portal/email
  content   String
  createdAt DateTime @default(now())

  @@index([ticketId])
  @@map("ticket_comments")
}

model KnowledgeArticle {
  id         String   @id @default(uuid())
  tenantId   String   @map("tenant_id")
  tenant     Tenant   @relation(fields: [tenantId], references: [id])
  title      String
  slug       String   @unique
  body       String
  tags       String[] @default([])
  published  Boolean  @default(false)
  authorId   String
  author     User     @relation(fields: [authorId], references: [id])
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@index([tenantId])
  @@index([published])
  @@map("knowledge_articles")
}
```

Add the reverse relations this requires on `Tenant`, `Lead`, `Contact`, `User`, `SlaRule` (Prisma
will tell you exactly which via `npx prisma validate` errors — add each missing back-relation
array field, e.g. `tickets Ticket[]` on `Tenant`/`Lead`/`Contact`, `assignedTickets Ticket[]` and
`ticketComments TicketComment[]` and `knowledgeArticles KnowledgeArticle[]` on `User`, `tickets
Ticket[]` on `SlaRule`).

Migration: `npx prisma migrate dev --name add_ticketing_and_kb`.

### 3.2 Backend module `backend/src/tickets/`
Mirror the structure of `backend/src/tasks/` (closest analog — same "create, assign, complete"
shape). Files: `tickets.module.ts`, `tickets.controller.ts`, `tickets.service.ts`, `dto/`.

Endpoints:
- `GET /tickets` — filters: `status`, `priority`, `assignedAgentId`, `leadId`. Paginate like
  `leads.controller.ts` does (copy its pagination query param pattern).
- `POST /tickets` — create. If `leadId` given, auto-attach `contactId` from that lead.
  Auto-assign `slaRuleId` by matching `SlaRule.condition` against ticket priority/subject if any
  active rule matches (reuse whatever condition-matching helper `backend/src/rules/` uses for
  `AutomationRule.condition` — do not write a second JSON-condition matcher).
  Set `dueAt = now() + slaRule.responseTimeMinutes` when a rule matches.
- `PATCH /tickets/:id` — update status/priority/assignment. Setting status to `RESOLVED` sets
  `resolvedAt = now()`.
- `POST /tickets/:id/comments` — add comment (internal or customer-visible).
- `GET /knowledge-articles` (+ `?published=true` for public/read-only use), `POST`, `PATCH`,
  `DELETE` — standard CRUD, `PATCH`/`DELETE`/unpublished-`POST` gated to staff roles.

Apply `@Roles(...)` on each method using exactly these role sets (and add matching keys to
`permissions.matrix.ts`):
```
'tickets:read':   ['OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'SUPPORT_AGENT', 'VIEWER'],
'tickets:write':  ['OWNER', 'ADMIN', 'MANAGER', 'SUPPORT_AGENT'],
'tickets:delete': ['OWNER', 'ADMIN', 'MANAGER'],
'knowledge_base:read':  ['OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'SUPPORT_AGENT', 'VIEWER'],
'knowledge_base:write': ['OWNER', 'ADMIN', 'MANAGER', 'SUPPORT_AGENT'],
```
So e.g. `@Post()` on `TicketsController` gets `@Roles('OWNER','ADMIN','MANAGER','SUPPORT_AGENT')`.
**Realtime:** emit `ticket:new` on create and `ticket:updated` on status/assignment change (new
event names, follow the `RealtimeGateway.emit` convention; add matching frontend listeners).

Wire an SLA breach check: extend whatever cron/scheduler already checks things periodically
(find `backend/src/automation/automation-scheduler.service.ts` — it likely already has a
`@Cron` pattern) — add a job that finds tickets where `dueAt < now()` and `status` not in
(`RESOLVED`,`CLOSED`) and no breach notification yet sent, then fire the existing
`slaBreach` notification preference path (schema.prisma:940, `NotificationPreference.slaBreach`)
— reuse the existing notification-sending mechanism, don't build a new one.

### 3.3 Frontend
Add `dashboard-v2/src/pages/TicketsPage.tsx`:
- List view with filter tabs (Open / In Progress / Waiting / Resolved / Closed), priority badges,
  SLA countdown/overdue indicator (red if `dueAt` passed).
- Ticket detail (modal or side drawer, follow whichever pattern `TasksPage.tsx` uses for its
  detail view) showing description, linked lead/contact (link to `LeadsPage`/`ContactsPage`
  detail), comment thread, status/priority/assignee dropdowns.
- "New ticket" button, optionally pre-filled with `leadId` when navigated to from a lead's
  detail view (add a "Create ticket" action on the lead detail view in `LeadsPage.tsx` if that
  view has an actions menu — check first).

Add `dashboard-v2/src/pages/KnowledgeBasePage.tsx`:
- Simple list + markdown editor (check if a markdown editor component/library is already used
  anywhere in `dashboard-v2` — e.g. for `TemplatesPage.tsx` — reuse it; otherwise a plain
  `<textarea>` is acceptable, do not add a new heavy WYSIWYG dependency for this).
- Publish/unpublish toggle, tag input, search by title/tag.

Register both routes/nav entries the same way Part 1 registered `/pipeline`.

### Acceptance criteria — Part 3
- Creating a ticket from a lead links it correctly; ticket list filters work.
- A ticket whose SLA rule matches shows a due-by time and flips to "overdue" styling once passed.
- Knowledge base articles can be created, published, and listed; unpublished articles are hidden
  from non-staff-facing views (if/when a public-facing widget consumes them later — for now just
  ensure the `published` filter works).
- Both backend and frontend build clean.

---

## Part 4 — Internal "CRM Copilot" (AI agent that operates the whole CRM for staff)

### Important distinction
`agent-service/` (LangGraph + `tools.py`) is the **customer-facing** bot that talks to *leads* on
WhatsApp/Telegram and can only act on the *one lead* it's currently conversing with (see
`ToolContext` in `agent-service/app/tools.py:7-12` — scoped to a single `lead_id`). Its existing
`AIAgentPage.tsx` in the frontend is a settings/monitoring page for *that* bot (tone, niche
config, run history) — do not repurpose it.

Part 4 is a **new, separate** agent: an internal copilot that a logged-in staff member (OWNER/
ADMIN/MANAGER/SALES_AGENT/SUPPORT_AGENT) chats with inside the dashboard to operate the CRM
broadly — search/filter leads, draft and send messages, create tasks/tickets, summarize a
contact's history, trigger campaigns, pull analytics, etc. Think "ask it to do CRM work in
natural language instead of clicking through pages."

### 4.1 Where it lives
Backend: new module `backend/src/copilot/` (NestJS). This module does NOT reimplement business
logic — it is a thin LLM-orchestration layer that calls the **existing** services
(`LeadsService`, `TasksService`, `CampaignsService`, `TicketsService` from Part 3,
`AnalyticsService`, `ConversationsService`, etc.) directly via Nest dependency injection. This
keeps permission checks, validation, and audit logging (all of which already exist per-service)
correct for free — the copilot is just another caller of those services, scoped to the
logged-in user's role. **How to enforce per-tool permissions:** the `CopilotController` itself is
guarded with `@UseGuards(JwtAuthGuard, RolesGuard)` and `@Roles(<all six roles>)` so any logged-in
user reaches it. Inside the service, before executing each tool, check the user's role
(`req.user.role`, passed into the service) against the same role set that the corresponding real
controller method requires — build a small helper `can(role, 'leads:write')` that reads
`PERMISSION_MATRIX` from `permissions.matrix.ts` and returns a boolean. Each tool calls `can(...)`
first; if false it returns an error string (see guardrail below) instead of executing. This makes
`PERMISSION_MATRIX` the single source of truth for the copilot's authorization.

### 4.2 LLM orchestration approach
Use the DeepSeek API via the `openai` npm package (add it to `backend/`) configured with
`baseURL: process.env.DEEPSEEK_BASE_URL` and `apiKey: process.env.DEEPSEEK_API_KEY`, model
`deepseek-chat` (all exact names in the conventions section). Do not introduce a second LLM
provider and do not add LangGraph/LangChain to the Node backend. Client construction:
```ts
import OpenAI from 'openai';
const client = new OpenAI({ apiKey: cfg.DEEPSEEK_API_KEY, baseURL: cfg.DEEPSEEK_BASE_URL });
// client.chat.completions.create({ model: 'deepseek-chat', messages, tools, tool_choice: 'auto' })
```
Keep the loop non-streaming (blocking) for v1 — return the full reply once the tool loop
finishes. Keep this simple:
1. `backend/src/copilot/copilot.service.ts` builds a tool list (JSON schema, OpenAI tool-calling
   format) mapping to internal service methods, e.g.:
   - `search_leads(filters)` → `LeadsService.findAll(filters)`
   - `get_lead_detail(leadId)` → `LeadsService.findOne(leadId)`
   - `update_lead_status(leadId, status)` → same method Part 1's move-stage endpoint calls
   - `create_task(leadId, title, priority, dueAt?)` → `TasksService.create(...)`
   - `create_ticket(subject, description, leadId?, priority?)` → `TicketsService.create(...)`
   - `draft_message(leadId, instructions)` → returns a suggested message text for the human to
     review/send (does NOT auto-send — see guardrail below)
   - `send_message(leadId, channel, text)` → `ConversationsService` send path (only exposed if
     the requesting user has `conversations:write` permission — check before registering this
     tool for that request)
   - `list_tickets(filters)`, `list_campaigns(filters)`, `get_analytics_overview(dateRange)`,
     `create_campaign(...)` similarly mapped to existing services.
   - **Every tool function must re-check the calling user's permission** (via the existing
     `PermissionsGuard` logic, called programmatically) before executing — the copilot must never
     bypass the permission matrix. If the user lacks permission for a requested action, the tool
     returns an error string like `"error: you do not have permission to do this"` rather than
     throwing, so the LLM can explain it to the user conversationally.
2. `POST /copilot/chat` — request `{ "message": "...", "conversationId": "...optional..." }`.
   Loads/creates a `CopilotConversation` (schema below), appends the user message, runs a
   tool-calling loop (**max 6 iterations** — hard cap so it can't loop forever, mirroring the
   `max_agent_steps` bound in `agent-service/app/graph.py:194`). Response contract:
   ```json
   {
     "conversationId": "...",
     "reply": "final assistant text",
     "actions": [
       { "tool": "search_leads", "args": {"segment":"HOT"}, "status": "success",
         "result": "found 12 leads", "requiresConfirmation": false },
       { "tool": "send_message", "args": {"leadId":"...","text":"..."}, "status": "pending",
         "requiresConfirmation": true, "pendingActionId": "act_abc123" }
     ]
   }
   ```
   Use the same `actions`/`actions_taken` shape `agent-service` already uses, for UI transparency.
- `GET /copilot/conversations` — list the current user's conversations (id, title, updatedAt),
  newest first. `GET /copilot/conversations/:id` — full message history.
- `POST /copilot/confirm-action` — body `{ "pendingActionId": "act_abc123" }`. Executes the stored
  pending action (see guardrail), returns `{ "status": "success", "result": "..." }` or an error.
3. **Guardrail**: any tool that mutates data and is "high impact" (`send_message`,
   `update_lead_status` to `LOST`, `create_campaign`, deleting anything) must return a
   `requiresConfirmation: true` flag in the tool result instead of executing immediately; the
   frontend shows a confirm button before calling `POST /copilot/confirm-action` with the
   pending action id. Read-only tools (`search_leads`, `get_analytics_overview`, etc.) execute
   immediately without confirmation. Store pending actions server-side keyed by a short-lived id
   (in-memory map or a `CopilotPendingAction` table — a simple in-memory Map with a 5-minute TTL
   is sufficient, no need for a new table unless multi-instance deployment is a concern — check
   `backend/src/main.ts`/deployment docs for whether the backend runs as multiple replicas; if
   single instance, in-memory is fine).

### 4.3 Schema addition (minimal — just conversation history)

```prisma
model CopilotConversation {
  id        String   @id @default(uuid())
  tenantId  String   @map("tenant_id")
  tenant    Tenant   @relation(fields: [tenantId], references: [id])
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  title     String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  messages  CopilotMessage[]

  @@index([userId])
  @@map("copilot_conversations")
}

model CopilotMessage {
  id             String              @id @default(uuid())
  conversationId String
  conversation   CopilotConversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  role           String              // user | assistant | tool
  content        String
  toolCalls      Json?               // [{tool, args, result, requiresConfirmation}]
  createdAt      DateTime            @default(now())

  @@index([conversationId])
  @@map("copilot_messages")
}
```

Add reverse relations on `Tenant`/`User`. Migration: `npx prisma migrate dev --name add_copilot`.

### 4.4 Frontend
Add `dashboard-v2/src/pages/CopilotPage.tsx` (or, if the app has a global floating-chat-widget
pattern already for something else, check first — otherwise a dedicated page is fine):
- Chat UI: message list, input box, "typing"/loading state while the backend tool-loop runs.
- Each assistant turn that included tool calls renders a compact "did: searched leads (12
  results), created task 'Follow up with Jane'" activity trace under the message (use the
  `actions_taken`-style array returned by `POST /copilot/chat`).
- When a response includes a `requiresConfirmation` action, render a confirm/cancel button pair
  inline; confirm calls `POST /copilot/confirm-action`.
- Conversation list sidebar (like a typical chat app) backed by `GET /copilot/conversations`.
- Add nav entry, e.g. "Copilot" with a sparkle/AI icon, visible to all roles (permission checks
  happen per-tool server-side, so the copilot entry point itself needs no gating beyond being
  logged in).

### Acceptance criteria — Part 4
- A logged-in SALES_AGENT can ask the copilot "show me my hot leads from this week" and get a
  real list back (calls `search_leads` under the hood, verify via network tab that
  `POST /copilot/chat` triggered a real `LeadsService` call, not a hallucinated answer).
- Asking it to "send a follow-up message to [lead name] saying we'll call tomorrow" produces a
  `requiresConfirmation: true` action; nothing is sent until the user clicks confirm; after
  confirming, the message actually appears in `MessagesPage.tsx` / on the real channel.
- A VIEWER-role user asking the copilot to send a message gets a polite refusal (permission
  check fires), not a crash.
- Conversation history persists across page reloads.
- Backend and frontend build clean.

---

## Global rules for the implementer (apply to all 4 parts)

1. **Reuse before you build.** This codebase already has ~40 backend modules and ~35 frontend
   pages. Before creating any new file, grep for related existing code and extend it. Every part
   above calls this out at least once — take it seriously everywhere else too.
2. **Never bypass `PERMISSION_MATRIX`.** Every new endpoint needs a permission key added to
   `backend/src/permissions/permissions.matrix.ts` and the existing guard applied the same way
   other controllers apply it.
3. **Every schema change gets a real Prisma migration**, committed. Do not hand-edit
   `migrations/` folders or the `_prisma_migrations` table.
4. **Do not touch `agent-service/`** except where Part 2 explicitly requires backend-side
   changes to support WhatsApp (that's all backend, not agent-service). Part 4's copilot is a
   separate system from `agent-service` — do not merge them or make agent-service call into it.
5. **No new frontend UI framework/library** beyond what's already in `dashboard-v2/package.json`
   unless a part explicitly says to add one (drag-and-drop in Part 1 is the one allowed
   exception, and only if nothing suitable is already installed).
6. After each part: run `cd backend && npm run build && npx prisma validate`, and
   `cd dashboard-v2 && npm run build`. Fix all errors before starting the next part. Do not
   proceed to Part 2 with a broken Part 1 build.
7. Write in the same code style as the surrounding files in each module you touch (NestJS
   decorators/DTO patterns, React component patterns) — match, don't introduce a new style.
8. Do not add tests unless a part explicitly asks — but do not break any existing test. Run
   existing test suites for any module you modify (`*.spec.ts` files) before considering that
   part done.

## Exact commands to run after every part (copy-paste)

```bash
# from repo root
cd backend
npx prisma validate            # schema is well-formed
npx prisma generate            # regenerate client after schema changes
npm run build                  # NestJS compiles clean — zero TS errors
npm test -- <module>           # run spec files for any module you touched (e.g. leads, tickets)

cd ../dashboard-v2
npm run build                  # frontend compiles clean — zero TS errors
```
If any of these fail, the part is NOT done. Fix before proceeding to the next part.

## Definition of Done (the whole plan is complete only when ALL of these are true)
- [ ] Part 1: `/pipeline` kanban works, drag-drop persists via `move-stage`, `LeadsPage` untouched.
- [ ] Part 2: WhatsApp inbound creates leads + outbound sends (with 24h-window handling); outbound
      HMAC webhooks fire on events; inbound webhook endpoint creates leads.
- [ ] Part 3: tickets CRUD + SLA due/overdue + KB CRUD all work; SLA breach cron wired.
- [ ] Part 4: copilot chat runs real tool calls, high-impact actions require confirmation, VIEWER
      is correctly refused write tools, history persists.
- [ ] All four `@Roles(...)`-guarded; matrix updated; no role can reach an endpoint it shouldn't.
- [ ] `backend` build + `dashboard-v2` build both green; no existing `*.spec.ts` broken.
- [ ] Four migrations exist under `backend/prisma/migrations/`, one per part that changed schema.
- [ ] New realtime events (`ticket:new`, `ticket:updated`, reused `lead:updated`) emit and the
      frontend listens.

## What the reviewer (Claude) will check after each part
- Correctness: does the feature actually work end-to-end (not just compile)?
- No regressions: existing pages/endpoints still function.
- Permission matrix integrity: no endpoint reachable by a role that shouldn't have it.
- No duplicated logic (e.g., a second status-update code path, a second event bus, a second
  condition-matcher).
- Migration correctness and reversibility.
