# DeploySafe CRM — V2 "Close the Gaps" Plan (7 → 9)

**⚠️ Architecture context (read before Initiative 0):** This product is **single-tenant-per-deployment**
— confirmed one `Tenant` row (`default-tenant`) in the live DB. "White-label" here does NOT mean a
shared multi-tenant SaaS with a tenant switcher. It means: **the agency deploys one fresh, rebranded
instance per client** (same model as the `deploysafe.in` production deployment). So Initiative 0 is
about finishing the branding + provisioning pipeline for that model, not building multi-tenancy.

**Audience:** AI coding agent (DeepSeek). Follow literally. Same rules as `PLAN_AI_CRM_UPGRADE.md` —
reuse before you build, `@Roles(...)` on every endpoint, one Prisma migration per initiative,
both builds must pass before moving on.

**Goal:** Build our *own* versions of the best features from 5 open-source CRMs, to close the gaps
identified in the competitive analysis. We are taking **inspiration**, not code (except where
noted MIT-safe).

---

## ⚖️ LICENSE RULES — READ FIRST (non-negotiable, legal)

DeploySafe is a commercial SaaS. Copying copyleft code into it could force us to open-source the
whole product. Therefore:

| Source CRM | License | What you may do |
|---|---|---|
| **Twenty** | AGPL-3.0 | **IDEAS ONLY.** Study UX/architecture, reimplement from scratch. Do NOT copy code. |
| **Frappe CRM** | AGPL-3.0 | **IDEAS ONLY.** Do NOT copy code. |
| **EspoCRM** | AGPL-3.0 | **IDEAS ONLY.** Do NOT copy code. |
| **Krayin** | MIT | ✅ Code may be read AND adapted, with attribution in a NOTICE file. |
| **BottleCRM** | MIT | ✅ Code may be read AND adapted, with attribution in a NOTICE file. |

**Rule:** For AGPL sources, you may look at their docs/UI to understand *what* a feature does, then
build your own implementation in our stack. Never paste their source. For MIT sources, if you adapt
a file, add a line to a new `NOTICE.md` at repo root: `Portions adapted from <repo> (MIT).`

---

## Verified codebase conventions (checked against the real code — these override assumptions)

Same as V1, restated for a fresh agent:
1. **Auth:** every controller uses `@UseGuards(JwtAuthGuard, RolesGuard)` at class level +
   `@Roles('OWNER', ...)` per method. Current user = `req.user` (`req.user.sub` = id,
   `req.user.role` = role). `PERMISSION_MATRIX` in `backend/src/permissions/permissions.matrix.ts`
   is the reference map — add your new keys there too.
2. **Roles:** `OWNER`, `ADMIN`, `MANAGER`, `SALES_AGENT`, `SUPPORT_AGENT`, `VIEWER`.
3. **Realtime:** `backend/src/realtime/realtime.gateway.ts` → `RealtimeGateway.emit(event, payload)`.
   Frontend already listens; add new event names + frontend listeners as needed.
4. **DB:** Prisma + Postgres, schema at `backend/prisma/schema.prisma`. **One migration per
   initiative** via `npx prisma migrate dev --name <n>` (interactive) — if the shell is
   non-interactive, generate with `npx prisma migrate diff --from-url <DATABASE_URL>
   --to-schema-datamodel prisma/schema.prisma --script > migration.sql` into a new
   `prisma/migrations/<timestamp>_<name>/` folder, then `npx prisma migrate deploy`. Run
   `npx prisma generate` after every schema change.
5. **Builds:** `cd backend && npm run build` and `cd dashboard-v2 && npm run build` must both pass
   before the next initiative.
6. **Frontend pages** live in `dashboard-v2/src/pages/`; register routes where `LeadsPage` is
   registered (`dashboard-v2/src/App.tsx`) and add nav links in
   `dashboard-v2/src/components/layout/sidebar.tsx`.

**Existing building blocks you MUST reuse (verified to exist):**
- `backend/src/custom-fields/` + models `CustomFieldDefinition` (fields: `name`, `key`, `type`,
  `target`, `options`, `required`, `active`, `displayOrder`) and `CustomFieldValue`. Enum
  `CustomFieldType = { TEXT, NUMBER, DATE, BOOLEAN, DROPDOWN, MULTI_SELECT }`. **Initiative 1
  extends THIS — do not build a parallel custom-field system.**
- `backend/src/shared/adapters/email.adapter.ts` — SMTP **send** via nodemailer already works.
  **Initiative 2 adds the inbound/IMAP half here — do not duplicate the send path.**
- `backend/src/analytics/` — `AnalyticsService` already computes overview metrics. **Initiative 3
  builds the report builder on top of this.**
- `backend/src/conversations/conversations.service.ts` — channel dispatch is a switch on `channel`
  (`SMS` / `WHATSAPP` / `TELEGRAM` cases). **Initiative 4 adds a `PHONE_CALL` case here.**
- `backend/src/copilot/copilot.service.ts` — the Copilot tool array (`search_leads`,
  `get_lead_detail`, `update_lead_status`, `create_task`, `create_ticket`, `draft_message`,
  `send_message`, ...). **Initiative 5 extends THIS tool list — do not build a second agent.**

Do the initiatives **in order, starting with Initiative 0**. Each is independently shippable.

---

## Initiative 0 — White-Label Branding + Provisioning  (do this FIRST)

### Why
DeploySafe is resold to clients as a branded product, one deployment per client. This only works if
branding actually flows through the whole app and a new client can be stood up fast. Right now it's
half-built:

**What already exists (verified — reuse, don't rebuild):**
- `niche-template-starter/` — a working "1-day spin-up runbook": its own `docker-compose.yml`,
  `niche.config.yaml`, `.env.example`, and a GitHub Actions deploy workflow. This IS your
  provisioning tool. Do not create a second one.
- `niche.config.yaml` schema already has a `branding:` block (`logo_url`, `primary_color`, `labels`)
  — validated on boot by `backend/src/bootstrap/config-loader.service.ts`.
- `Tenant.domain` field already exists in the schema (currently always blank/unused).
- `BusinessSettings` model (`backend/prisma/schema.prisma:285`) already stores `businessName`,
  already written by `config-loader.service.ts` on every boot.

**What's actually broken/missing (confirmed by reading the code, not assumed):**
1. `config-loader.service.ts` (~line 111-127) reads `config.niche?.display_name` and writes it to
   `BusinessSettings.businessName` on boot — but **it never reads or persists
   `config.branding.logo_url` / `config.branding.primary_color` / `config.branding.labels` anywhere**.
   Those fields are validated by the schema but silently discarded.
2. The frontend (`dashboard-v2/src/pages/WorkspacePage.tsx`) calls `api('/niche-config')` —
   **this route does not exist on the backend at all** (verified: no controller anywhere registers
   it). This page has been permanently broken/dead since it was written — it always falls into the
   "No Workspace" empty state.
3. `dashboard-v2/index.html` has a hardcoded title `"Lead Auto - Client Automation Dashboard"` and a
   default favicon — not client-branded.
4. `LoginPage.tsx` and the sidebar (`dashboard-v2/src/components/layout/sidebar.tsx`) have no logo
   or brand-color theming — every client deployment currently looks identical inside the app.
5. `Tenant.domain` is stored but nothing reads it — there is no Caddy/reverse-proxy template in this
   repo to wire a client's custom domain to their deployment (the real `deploysafe.in` Caddy config
   referenced in project memory lives outside this repo, per-server, not templated here).

### 0.1 Schema
Add branding fields to `BusinessSettings` (this is the correct existing home — it's already the
one-row-per-deployment settings table, matching the single-tenant model):
```prisma
model BusinessSettings {
  // ...existing fields unchanged...
  logoUrl      String?
  faviconUrl   String?
  primaryColor String  @default("#0B5")
  labels       Json    @default("{}")   // e.g. {"lead":"Lead","leads":"Leads"}
}
```
Migration: `add_business_settings_branding`.

### 0.2 Backend
- **Fix `config-loader.service.ts`:** in the same `businessSettings.update`/`.create` calls at
  lines ~111-127, add `logoUrl: config.branding?.logo_url || null`,
  `primaryColor: config.branding?.primary_color || '#0B5'`,
  `labels: config.branding?.labels || {}`. This makes boot-time branding actually persist —
  one-line fix to existing code, not new logic.
- **New public endpoint `GET /branding`** (in `backend/src/business-settings/` — extend that
  module, do not create a new one): returns
  `{ businessName, logoUrl, faviconUrl, primaryColor, labels }` from the single `BusinessSettings`
  row. **Must be unauthenticated** (no `@UseGuards`) — the login page needs it before a user is
  logged in. This is safe: it exposes only cosmetic data, never PII.
- **Fix the dead route:** either rename the frontend's `api('/niche-config')` call to
  `api('/branding')`, or add `/niche-config` as an alias route returning the same payload — prefer
  renaming the frontend call, it's the actual bug.
- **`PATCH /business-settings`** already likely exists for the other settings fields (check
  `business-settings.controller.ts`) — extend its DTO to accept `logoUrl`, `faviconUrl`,
  `primaryColor`, `labels` so an OWNER/ADMIN can update branding post-deploy without a redeploy
  (agility beyond "edit yaml, redeploy" for quick tweaks). Gate with the existing `settings:write`
  permission key.
- **Logo/favicon upload:** reuse the existing `backend/src/media/` upload endpoint (do not build a
  second file-upload path) — upload returns a URL, frontend then calls `PATCH /business-settings`
  with that URL as `logoUrl`/`faviconUrl`.

### 0.3 Frontend
- **Fix `WorkspacePage.tsx`:** point it at `GET /branding` instead of the dead `/niche-config`; add
  an edit form (logo upload via the media endpoint, color picker, business name, label overrides)
  wired to `PATCH /business-settings`. Gate editing to OWNER/ADMIN (same pattern as other admin-only
  pages).
- **Apply branding app-wide** — add a small bootstrap step (e.g. in `App.tsx`, before rendering
  routes): fetch `GET /branding` once, then:
  - Set `document.title = businessName` (or a sensible default if empty).
  - Swap the favicon `<link>` href if `faviconUrl` is set.
  - Set the CSS variable `--primary` (the theme already uses CSS vars like `var(--primary)` per
    existing components — confirm the exact variable name in `dashboard-v2/src/index.css` and set
    it via `document.documentElement.style.setProperty('--primary', primaryColor)`).
  - Store the fetched branding in a small context/hook (e.g. `useBranding()`) so `LoginPage.tsx` and
    the sidebar can render `logoUrl` in place of any hardcoded logo/text.
- **`LoginPage.tsx`:** render the fetched logo (fallback to a text wordmark using `businessName` if
  no logo set) above the login form.
- **Sidebar:** render the logo at the top in place of any hardcoded product name.
- Custom labels (`labels.lead` / `labels.leads`, etc.) are a nice-to-have text-replacement pass —
  only wire this if time allows; do not block the rest of Initiative 0 on it.

### 0.4 Provisioning — close the domain loop
- In `niche-template-starter/`, add a `Caddyfile.template` with a `{{DOMAIN}}` placeholder (reverse
  proxying `/` to the dashboard container and `/api/*` to the backend container, mirroring the
  same-origin `/api` pattern already used by the real `docker-compose.yml`'s `VITE_API_URL: /api`
  comment). Add a step to the README: "Step 4.5: copy `Caddyfile.template` to `Caddyfile`, replace
  `{{DOMAIN}}` with your domain, run Caddy alongside the compose stack (or point your existing Caddy
  install at it)." This documents/templates the same manual setup already done once for
  `deploysafe.in`, so the next client deployment doesn't require re-deriving it.
- No code changes needed to `Tenant.domain` itself for this phase — it's informational metadata for
  now; actual routing is handled by the Caddy template. Do not build dynamic domain-based routing
  logic in the backend — that would be multi-tenant complexity this architecture deliberately avoids.

### Acceptance — Initiative 0
- Editing `niche.config.yaml`'s `branding` block before first boot results in the configured logo/
  color/name appearing on the login page, sidebar, browser tab title, and favicon after `docker
  compose up`.
- An OWNER can also change the logo/color live from `WorkspacePage.tsx` post-deploy, without a
  redeploy, and it reflects immediately on next page load.
- `GET /branding` works with no auth token (verify with a plain unauthenticated curl).
- `niche-template-starter/README.md` has a clear domain-setup step referencing the new
  `Caddyfile.template`.
- Both builds pass; no existing settings functionality regresses.

---

## Initiative 1 — "Studio": No-code Custom Object & Field Builder  (inspired by EspoCRM)

### Why
EspoCRM's crown jewel is its Entity Manager + Layout Manager: admins add fields, dropdowns, even
whole entities from a UI — no code, no migration. We already have half of it
(`CustomFieldDefinition`) but there is **no admin UI** to manage it, and it only attaches to Lead/
Contact (via `CustomFieldTarget`). This is our #1 competitive gap.

### Scope (v1 — deliberately limited, do NOT build full custom *entities* yet)
Build a UI to manage **custom fields** on the existing targets (Lead, Contact, and add `TICKET` as
a new `CustomFieldTarget` value). Custom *objects/entities* are a future phase — out of scope here.

### 1.1 Backend (extend `backend/src/custom-fields/`)
The controller/service already exist — read them first. Ensure these endpoints exist (add only
what's missing):
- `GET /custom-fields?target=LEAD|CONTACT|TICKET` — list definitions ordered by `displayOrder`.
- `POST /custom-fields` — create a definition. Validate `key` is unique per target (the
  `@@unique([key, target])` already enforces this — return a clean 409 on conflict). Body:
  ```json
  { "name": "Company Size", "key": "company_size", "type": "DROPDOWN", "target": "LEAD",
    "options": ["1-10","11-50","51+"], "required": false }
  ```
- `PATCH /custom-fields/:id` — edit name/options/required/active/displayOrder. Do NOT allow
  changing `key` or `type` after creation (data integrity) — reject with 400.
- `PATCH /custom-fields/reorder` — body `{ "ids": [...] }`, sets `displayOrder` per index in a
  transaction.
- `DELETE /custom-fields/:id` — soft-delete by setting `active=false` (do NOT hard-delete; values
  reference it). 
- Permissions: reuse `custom_fields:read` / `custom_fields:write` (already in the matrix at
  `permissions.matrix.ts` — `write` is `['OWNER','ADMIN']`). Apply matching `@Roles(...)`.

Add `TICKET` to the `CustomFieldTarget` enum in `schema.prisma` and let `CustomFieldValue`
optionally reference a ticket (`ticketId String?` + relation). Migration:
`add_ticket_custom_field_target`.

### 1.2 Frontend — `dashboard-v2/src/pages/StudioPage.tsx`
- Admin-only page (gate like other admin pages — check how `AdminPanel.tsx` / `SettingsPage.tsx`
  gate by role).
- Target selector (Lead / Contact / Ticket). For the selected target: a drag-to-reorder list of
  fields (reuse the `@dnd-kit` already installed for the pipeline board) with add/edit/deactivate.
- Field editor form: name, key (auto-slugified from name, locked after create), type dropdown
  (the 6 `CustomFieldType` values), options editor (only shown for `DROPDOWN`/`MULTI_SELECT`),
  required toggle.
- **Make custom fields actually render:** on the Lead detail and Contact detail views (in
  `LeadsPage.tsx` / `ContactsPage.tsx`), render the active custom fields for that target as
  editable inputs, reading/writing `CustomFieldValue` via the existing custom-fields value
  endpoints (find how values are currently read — grep `CustomFieldValue` usage in the frontend;
  if custom-field values aren't surfaced in the UI at all yet, add a "Custom Fields" section to the
  detail view). This is the payoff — a field added in Studio immediately appears on records.

### Acceptance — Initiative 1
- An ADMIN adds a `DROPDOWN` field "Company Size" to Lead in Studio; it immediately appears as an
  editable dropdown on every Lead detail view and persists.
- Reordering fields in Studio changes their order on the record view.
- Deactivating a field hides it from records but does not delete stored values.
- Both builds pass; `custom-fields.service.spec.ts` still green.

---

## Initiative 2 — 2-Way Email Sync (IMAP inbound)  (inspired by Krayin — MIT, code-safe)

### Why
Every top competitor has an email inbox tied to contacts; we only *send* (SMTP via
`email.adapter.ts`). No inbound email → no email conversation history. Krayin (MIT) has a clean
IMAP-to-lead parser you may adapt (add attribution to `NOTICE.md`).

### 2.1 Backend
- Extend `backend/src/shared/adapters/email.adapter.ts` (do NOT make a new adapter): add an
  `imap` receive capability using the `imapflow` + `mailparser` npm packages (add to `backend/`).
  Config via env: `IMAP_HOST`, `IMAP_PORT`, `IMAP_USER`, `IMAP_PASS`, `IMAP_TLS`.
- New service `backend/src/conversations/email-sync.service.ts` (co-locate with conversations since
  emails become `ConversationMessage`s): on a `@Cron` schedule (every 2 min — mirror the cron
  pattern in `backend/src/automation/` schedulers), poll the IMAP inbox for unseen messages. For
  each:
  1. Parse from-address, subject, body (Krayin's parser logic as reference).
  2. Match to an existing `Contact` by email; if none, create Contact + Lead
     (`source = LeadSource.CAMPAIGN` fallback or a new `EMAIL` source value — add `EMAIL` to the
     `LeadSource` enum).
  3. Create a `ConversationMessage` (`channel = EMAIL`, `direction = INBOUND`) — the enum value
     `EMAIL` already exists in `MessageChannel`.
  4. Emit `conversation:new` via `RealtimeGateway` (existing event) and fire the existing
     `CONVERSATION_MESSAGE_RECEIVED` automation event (reuse the event path the Telegram/WhatsApp
     inbound handlers use).
  5. Mark the IMAP message seen.
- **Outbound reply:** in `conversations.service.ts`, the channel switch already has cases for SMS/
  WHATSAPP/TELEGRAM — add an `EMAIL` case that calls `emailAdapter.send(...)`, threading the reply
  (set the subject to `Re: <original>` — track the original subject in message `metadata`).

### 2.2 Frontend
- Emails already flow into the unified inbox (`MessagesPage.tsx`) because they're
  `ConversationMessage`s — verify they render with an email icon/channel badge; add the `EMAIL`
  channel styling if missing.
- Add IMAP/SMTP settings to `SettingsPage.tsx` (or `IntegrationsPage.tsx` — wherever channel
  config lives) so a non-dev can enter mailbox credentials. Gate to ADMIN.

### Acceptance — Initiative 2
- Sending an email to the configured mailbox creates (or attaches to) a Lead and shows the message
  inbound in `MessagesPage.tsx` within one poll cycle.
- Replying from the CRM sends a real email that threads under the same subject.
- Both builds pass.

---

## Initiative 3 — Custom Report / Dashboard Builder  (inspired by EspoCRM + BottleCRM MIT)

### Why
We have fixed analytics (`AnalyticsPage.tsx`); competitors let users define their own reports
(pick entity, filters, group-by, chart type). Closes gap #4.

### 3.1 Schema
```prisma
model SavedReport {
  id        String   @id @default(uuid())
  tenantId  String   @map("tenant_id")
  tenant    Tenant   @relation(fields: [tenantId], references: [id])
  name      String
  entity    String   // "lead" | "conversion" | "ticket" | "revenue"
  config    Json     // { metric, groupBy, filters:[], chartType, dateRange }
  ownerId   String
  owner     User     @relation(fields: [ownerId], references: [id])
  isShared  Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([tenantId])
  @@index([ownerId])
  @@map("saved_reports")
}
```
Add reverse relations on `Tenant`/`User`. Migration: `add_saved_reports`.

### 3.2 Backend `backend/src/reports/` (mirror `analytics/` module structure)
- `GET /reports` (list, honoring `isShared` + ownership), `POST /reports`, `PATCH /reports/:id`,
  `DELETE /reports/:id`.
- `POST /reports/run` — body = a report `config` (or `{ reportId }`). Server-side, translate config
  into a **safe, whitelisted** Prisma aggregation — NEVER build raw SQL from user input. Support:
  entity ∈ {lead, conversion, ticket, revenue}; metric ∈ {count, sum(amount), avg(score)};
  groupBy ∈ a fixed allow-list per entity (e.g. lead → status/segment/source/assignedAgent/
  createdAt-bucket); filters using the same fields. Reuse `AnalyticsService` helpers where they
  already compute similar aggregates. Return `{ labels: [], series: [] }` ready for charts.
- Permissions: reuse `analytics:read` for run/list; add `reports:write`
  (`['OWNER','ADMIN','MANAGER']`) to the matrix for create/edit/delete.

### 3.3 Frontend — `dashboard-v2/src/pages/ReportsPage.tsx`
- Report builder: entity picker → metric → group-by → filters → chart type (bar/line/pie). Live
  preview calling `POST /reports/run` (recharts is already used in `AnalyticsPage.tsx` — reuse it).
- Save / load / share reports. A "Saved Reports" list. Optionally let a saved report be pinned to
  the Overview dashboard.

### Acceptance — Initiative 3
- A MANAGER builds "Leads by source, last 30 days, bar chart", sees a live preview, saves it,
  reloads the page, and re-runs it.
- Only whitelisted fields/aggregations are accepted; an arbitrary `groupBy` is rejected (no SQL
  injection surface).
- Both builds pass.

---

## Initiative 4 — Telephony: Click-to-Call + Call Logging  (inspired by Frappe CRM)

### Why
Voice is the one channel we lack. Frappe integrates Twilio/Exotel with call recording. We already
have Twilio wired for SMS (`integrations.service.ts` references Twilio) — extend it to voice.

### 4.1 Schema
```prisma
enum CallDirection { INBOUND OUTBOUND }
enum CallStatus { INITIATED RINGING IN_PROGRESS COMPLETED FAILED NO_ANSWER BUSY }

model CallLog {
  id           String        @id @default(uuid())
  tenantId     String        @map("tenant_id")
  tenant       Tenant        @relation(fields: [tenantId], references: [id])
  leadId       String?
  lead         Lead?         @relation(fields: [leadId], references: [id])
  contactId    String?
  contact      Contact?      @relation(fields: [contactId], references: [id])
  agentId      String?
  agent        User?         @relation(fields: [agentId], references: [id])
  direction    CallDirection
  status       CallStatus    @default(INITIATED)
  fromNumber   String
  toNumber     String
  durationSec  Int?
  recordingUrl String?
  providerSid  String?       // Twilio Call SID
  notes        String?
  createdAt    DateTime      @default(now())

  @@index([tenantId])
  @@index([leadId])
  @@map("call_logs")
}
```
Reverse relations on Tenant/Lead/Contact/User. Migration: `add_call_logs`.

### 4.2 Backend `backend/src/telephony/`
- `POST /telephony/call` — body `{ leadId }`. Uses Twilio Voice API (reuse the Twilio credentials
  already configured for SMS) to initiate a call from the agent's number to the lead's phone
  (click-to-call). Create a `CallLog` (`OUTBOUND`, `INITIATED`).
- `POST /webhooks/twilio/voice-status` — Twilio status callback: update the matching `CallLog` by
  `providerSid` (status, duration, recordingUrl). Add this alongside the existing webhook handlers
  in `backend/src/webhooks/`.
- On call completion, also create a `ConversationMessage` (`channel = PHONE_CALL`, which already
  exists in `MessageChannel`; direction from call direction) with a system summary
  ("Call — 3m12s, recording attached") so calls appear in the unified timeline/inbox. Add the
  `PHONE_CALL` case to the `conversations.service.ts` channel switch if outbound logging needs it.
- Permissions: add `telephony:read` (all staff) + `telephony:write`
  (`['OWNER','ADMIN','MANAGER','SALES_AGENT']`) to the matrix.

### 4.3 Frontend
- A "Call" button on the Lead detail view (needs a phone number). Clicking → `POST /telephony/call`,
  show a live call-status toast.
- A calls section on the lead timeline showing history + a `<audio>` player for `recordingUrl`.

### Acceptance — Initiative 4
- Clicking "Call" on a lead with a phone number initiates a real Twilio call and creates a
  `CallLog`; when it ends, duration + recording populate and a `PHONE_CALL` message appears in the
  lead's history.
- Both builds pass.

---

## Initiative 5 — Copilot "Skills" expansion  (inspired by Twenty agents + BottleCRM MCP)

### Why
Our Copilot already beats most competitors, but its toolset is narrow. Twenty/BottleCRM expose
broad agent capabilities. Extend our existing Copilot (do NOT build a new agent) so it can operate
the new V2 features.

### 5.1 Backend — extend `backend/src/copilot/copilot.service.ts` tool array
Add these tools (each following the existing pattern: JSON-schema tool def + a `can(role, perm)`
permission check + call the real service; mutating/high-impact ones return
`requiresConfirmation: true`):
- `run_report(config)` → `ReportsService.run` (Initiative 3) — read-only.
- `list_tickets(filters)` / `update_ticket(id, patch)` → `TicketsService`.
- `initiate_call(leadId)` → `TelephonyService.call` (Initiative 4) — **requiresConfirmation**.
- `send_email(leadId, subject, body)` → conversations `EMAIL` path (Initiative 2) —
  **requiresConfirmation**.
- `create_custom_field(target, name, type, options?)` → `CustomFieldsService` (Initiative 1) —
  **requiresConfirmation**, OWNER/ADMIN only via `can()`.
- `get_analytics_overview(range)` → `AnalyticsService` — read-only.
- Update the system prompt's tool list (the `You have access to the following tools:` block) to
  describe each new tool so the model knows to use them.

### 5.2 Frontend
No new page — these surface automatically in `CopilotPage.tsx` via the existing `actions` render +
confirmation flow. Verify a new confirmation-required tool (e.g. `initiate_call`) shows the
confirm/cancel buttons.

### Acceptance — Initiative 5
- Asking the Copilot "call John Smith" produces a `requiresConfirmation` action that, once
  confirmed, initiates a real call (Initiative 4).
- Asking "show me a chart of leads by source this month" runs a report and returns data.
- A VIEWER asking to "add a custom field" is refused by the permission check.
- Both builds pass.

---

## Global rules (all initiatives)
1. Reuse the listed existing modules — never build a parallel system.
2. Every endpoint: `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(...)` + matrix key.
3. One migration per initiative; run `prisma generate`; both builds green before the next.
4. AGPL sources = ideas only. MIT sources (Krayin, BottleCRM) = code may be adapted **with a line
   in `NOTICE.md`**.
5. Match surrounding code style. Don't break existing `*.spec.ts`.
6. Reports `run` endpoint and any user-config-driven query MUST use whitelisted fields + Prisma
   aggregations only — never raw SQL from user input.

## Definition of Done (V2 complete when all true)
- [ ] Branding: logo/color/name flow through login, sidebar, favicon, title; live-editable by
      OWNER without redeploy; `GET /branding` works unauthenticated; domain setup documented.
- [ ] Studio: no-code custom fields manageable in UI and rendering on Lead/Contact/Ticket records.
- [ ] Email: inbound IMAP creates/attaches conversations; outbound replies thread correctly.
- [ ] Reports: user-built reports run (whitelisted) and save/share.
- [ ] Telephony: click-to-call + call logging + recording on lead timeline.
- [ ] Copilot: new tools work with confirmation + permission gating.
- [ ] 5 migrations added (branding fields, Studio target, saved_reports, call_logs — email/copilot
      may need enum migrations too); both builds green; existing tests unbroken; `NOTICE.md`
      present if any MIT code was adapted.

## Recommended order & why
0. **Branding** (fixes a dead endpoint + makes every deployment actually look client-owned — do
   this before selling/deploying to any new client) →
1. **Studio** (biggest feature gap, biggest perceived jump) → 2. **Email** (table-stakes) →
3. **Reports** (MIT code available, fast) → 4. **Telephony** (new channel) →
5. **Copilot Skills** (ties it all together for the AI story).
