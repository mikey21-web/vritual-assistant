# DeepSeek Build Prompt — Autonomous Automation Engine (replaces n8n)

You are a senior engineer building the **autonomous automation engine** for a lead-capture → nurture → book → convert platform. Today, automation lives in **n8n workflows** (timers + fixed message templates). You will replace that with an **LLM-driven, durable, time-and-event-driven agent** built on the existing Python **LangGraph `agent-service`** and the **NestJS backend**. This document is the full, self-contained spec — you do not need any other file to do the work, but you MUST read the files it names before editing them.

## Stack & file map (ground truth — verify before editing)

- **Backend:** NestJS + Prisma + Postgres. BullMQ + Redis already configured (see `backend/src/automation-events/automation-events.processor.ts` for the existing `@Processor` pattern — copy it).
  - Outbound send today: `POST /conversations/messages` (`backend/src/conversations/`). **No policy checks exist.**
  - `backend/src/leads/leads.service.ts` — `score()`, `assign()`, `determineSegment()`.
  - `backend/src/nurture-sequences/` — CRUD only. `NurtureProgress` model exists in `schema.prisma` but **nothing ever writes it**.
  - `backend/src/advanced-features/advanced-features.service.ts` — has `checkBlocklist()`, `addToBlocklist()`.
  - `backend/src/webhooks/webhooks.service.ts` — inbound message handling.
  - `backend/prisma/schema.prisma` — models: `Lead`, `Contact`, `ConversationMessage`, `NurtureSequence`, `NurtureStep`, `NurtureProgress`, `BlocklistEntry`, `BusinessSettings`, `AutomationEvent`.
- **Agent service:** FastAPI + LangGraph (`agent-service/app/`): `main.py` (routes), `runner.py` (`execute_run`), `graph.py` (load_context→agent→tools→persist), `tools.py` (13 tools), `prompt.py`, `backend_client.py` (the ONLY way the agent touches data), `config.py` (`Settings`), `schemas.py` (`AgentRunRequest`), `idempotency.py` (Redis).
  - Model ids: `claude-haiku-4-5`, `claude-sonnet-4-6`, `claude-opus-4-8`.
  - **Principle (do not break): the agent never touches the database directly.** All reads/writes go through `backend_client` → backend REST API. (Exception explicitly allowed in Phase 3 below.)

## Architecture you are building — three planes

```
TIMING PLANE   = backend BullMQ durable timers ("wake lead X at T for reason R")
DECISION PLANE = LangGraph agent (the brain; invoked per trigger)
POLICY PLANE   = backend MessagePolicyService (the conscience; LLM cannot bypass)
```

The LLM is the brain but is **untrusted**. Every outbound side-effect passes through the policy plane. Timing is a dumb, durable backend timer; intelligence (what to say, whether to act, when to re-engage) is 100% in the LangGraph agent.

## Ground rules (read first)

1. **Do the phases in order. 0 → 5.** Phase 0 is the safety floor; nothing autonomous ships before it is green.
2. **Test-first for every behavioral change.** Backend: Jest (`cd backend && npm test`). Agent: pytest (`cd agent-service && pytest`). For each fix, write a failing test that reproduces the gap, then make it pass.
3. **Every schema change = a new Prisma migration** (`backend/prisma/migrations/...`) + backfill where existing rows would violate new constraints. Never edit an applied migration.
4. **Do not break the API shape** consumed by `dashboard-v2/src/lib/data.ts` or by `agent-service/app/backend_client.py`. If a contract must change, update the caller in the same commit.
5. **Commit per phase** with a clear message. After each phase run: `cd backend && npx prisma generate && npm run build && npm test` and `cd agent-service && pytest`. Keep `.github/workflows/ci.yml` green.
6. **Tenancy note:** the codebase currently carries `tenantId`. Keep threading it through new code. (A separate migration will strip tenancy later for single-tenant-per-deploy; your code must not assume it's gone, but must not deepen reliance on cross-tenant behavior either.)

---

## PHASE 0 — Policy send-gate + concurrency safety (backend + agent) — KEYSTONE

**Goal:** the agent can never send something illegal, rude, mistimed, or duplicated, and concurrent runs for one lead cannot corrupt state.

### 0.1 Consent model (DPDP requirement — there is none today)
- `schema.prisma`: add to `Contact`: `consentStatus String @default("unknown")` (`unknown|opted_in|opted_out`), `consentSource String?`, `consentAt DateTime?`, `optedOutAt DateTime?`. Add per-channel granularity via a new model `ConsentEvent { id, contactId, channel, action (opt_in|opt_out), source, createdAt, tenantId? }`. Migration + index on `contactId`.
- Inbound STOP handling: in `webhooks.service.ts`, if an inbound message body matches `/^\s*(stop|unsubscribe|cancel|opt.?out)\s*$/i`, set the contact `optedOutAt`, write a `ConsentEvent(opt_out)`, and send a single confirmation. Add a test.

### 0.2 `MessagePolicyService` (the gate)
- New `backend/src/conversations/message-policy.service.ts`. Every outbound send funnels through `evaluate(leadId, channel, text, opts)` returning `{ allowed: boolean, reason?: string, action?: 'reschedule', rescheduleAt?: Date, requiresTemplate?: boolean }`.
- Checks, in order (fail closed):
  1. **Opt-out / consent**: contact `optedOutAt` set OR (marketing intent AND `consentStatus != opted_in`) → `allowed:false, reason:'no_consent'`.
  2. **Blocklist**: reuse `advanced-features.checkBlocklist()` → block.
  3. **Quiet hours**: add `quietHoursStart/quietHoursEnd/timezone` to `BusinessSettings`. If now is in quiet hours → `allowed:false, action:'reschedule', rescheduleAt:<next allowed local time>`.
  4. **Rate limit**: count OUTBOUND `ConversationMessage` for this lead in the last hour/day; if over configurable caps → reschedule.
  5. **Dedup**: hash normalized `text`; if an identical/near-identical OUTBOUND message was sent to this lead within N hours → block (`reason:'duplicate'`).
  6. **WhatsApp 24h window**: if channel is WHATSAPP and the last INBOUND message is >24h old (or none) → `requiresTemplate:true`; if the send has no approved `messageTemplateId`, block with `reason:'outside_window_no_template'`.
- Wire `POST /conversations/messages` (and any nurture/broadcast path) to call `evaluate()` first. On `reschedule`, enqueue a delayed retry (Phase 1 scheduler) instead of sending. Persist the decision on the message row (`deliveryStatus: 'blocked'|'rescheduled'|'pending'` + reason in `metadata`).
- **Tests:** opted-out lead → blocked; quiet hours → rescheduled; duplicate → blocked; WhatsApp outside window without template → blocked.

### 0.3 Atomic field merge (fix lost-update race)
- `backend_client.update_custom_fields` does GET-then-PATCH on `metadata` → lost updates under concurrency. Add backend endpoint `PATCH /leads/:id/metadata` that merges atomically server-side (Prisma `update` with a jsonb merge in a transaction). Change `backend_client.update_custom_fields` to call it (single call, no read-modify-write). Test: two concurrent merges both persist.

### 0.4 Per-lead serialization
- In `agent-service/app/runner.py`, before running the graph, acquire a **per-lead lock** (Redis `SET lock:lead:{leadId} <runId> NX EX=120`). If not acquired, requeue/skip with backoff (do not run two graphs for one lead concurrently). Release in `finally`.
- Fix `idempotency.py`: `mark_done` currently **deletes** the key, so retried triggers re-run. Keep the key for its TTL (mark status `done`); `already_processed` returns true for the whole TTL window. Test: same `triggerId` twice → second is skipped.

**Phase 0 acceptance:** a send is impossible when opted-out/quiet/duplicate/out-of-window; concurrent runs for one lead are serialized; metadata merges never lose writes; retried triggers don't double-run.

---

## PHASE 1 — Durable scheduler + self-rescheduling journey (backend) — replaces n8n timers

**Goal:** give the lead journey a durable home. Timers survive restarts, are deduplicated, and are cancellable.

### 1.1 `ScheduledAction` model
```prisma
model ScheduledAction {
  id         String   @id @default(uuid())
  leadId     String
  kind       String   // 'nurture_step' | 'followup' | 're_engage' | 'send_retry'
  runAt      DateTime
  payload    Json     @default("{}")   // { stepIndex, intent, channel, text?, messageTemplateId? }
  status     String   @default("pending") // pending|claimed|done|cancelled|superseded|failed
  dedupeKey  String   @unique           // e.g. 'nurture:{leadId}:{step}'
  attempts   Int      @default(0)
  tenantId   String?
  createdAt  DateTime @default(now())
  @@index([status, runAt])
  @@index([leadId])
}
```

### 1.2 `AutomationSchedulerService` (BullMQ)
- New `backend/src/automation/automation-scheduler.service.ts`. Copy the BullMQ wiring from `automation-events.processor.ts`.
- `schedule(leadId, kind, runAt, payload)` → upsert a `ScheduledAction` (by `dedupeKey`) AND enqueue a BullMQ **delayed job** with `jobId = dedupeKey`, `delay = runAt - now` (dedup is automatic by jobId).
- `cancel(leadId, kinds[])` → mark matching pending actions `cancelled` and remove their BullMQ jobs.
- A `@Processor('automation-schedule')` whose `process(job)` claims the action (`status: 'claimed'`, guarded by an atomic `updateMany where status='pending'`), then calls the agent: `POST {AGENT_SERVICE_URL}/agent/run` with header `x-agent-key` and body `AgentRunRequest{ leadId, tenantId, triggerId: dedupeKey, channel, trigger: kind, messageText: null }`. On non-2xx, mark `failed`/retry with backoff (reuse the existing exponential pattern).

### 1.3 Write `NurtureProgress` + self-rescheduling
- When a lead enters a nurture sequence (on qualify, or on `lead_created` per niche config), create `NurtureProgress { leadId, sequenceId, currentStep: 0, nextStepAt }` and `scheduler.schedule(leadId,'nurture_step', nextStepAt, {stepIndex:0, sequenceId})`.
- Add `POST /automation/advance-nurture` (called by the agent's run-summary, see 1.4): increments `NurtureProgress.currentStep`, computes the next step's `delayHours` from the sequence, and schedules the next `nurture_step` (or marks the sequence complete).

### 1.4 Agent re-arms the next action at end of run
- In `agent-service/app/graph.py::_persist_node` (or `backend_client.post_run_summary` payload), include the agent's decision for the next proactive touch (or "none"). Backend's `/agent/run-summary` then calls the scheduler to arm/cancel accordingly. The journey becomes **self-rescheduling**, not a fixed cron.

**Phase 1 acceptance:** scheduling a nurture step survives a backend restart; the same step can't be double-scheduled (dedupeKey); completing a step schedules the next; `NurtureProgress` reflects reality.

---

## PHASE 2 — Trigger types, supersession, pre-flight gate (agent + backend)

**Goal:** proactive runs are coherent (don't fight live conversations) and cheap (don't always spin the full loop).

### 2.1 Trigger → prompt mapping
- In `graph.py::_load_context`, replace the single `trigger == 'lead_created'` branch with a map:
  - `incoming_message` → use `messageText` (existing).
  - `lead_created` → "A new lead just came in. Introduce yourself warmly."
  - `nurture_step` → "Scheduled follow-up. Read the lead's stage and collected fields; send the right next nurture message. If they've gone quiet, re-engage naturally."
  - `followup` → "This lead hasn't responded in a while. Re-engage without being pushy."
  - `re_engage` → "This lead went cold. Lead with value, not a hard sell."
- Pass `trigger` through `AgentRunRequest` (already present in `schemas.py`).

### 2.2 Supersession (the conversation-vs-drip collision)
- In `webhooks.service.ts` inbound-message handler: when an inbound message arrives for a lead, call `scheduler.cancel(leadId, ['nurture_step','followup','re_engage'])` BEFORE invoking the agent. Pending proactive timers are superseded; the agent re-arms the next one at end of run (1.4). Test: schedule a drip, simulate inbound reply, assert the drip is cancelled.

### 2.3 Pre-flight gate (cheap short-circuit + model tiering)
- Add a node at the START of the graph (before the expensive agent node) that, using lead context only (no LLM, or a single Haiku call):
  - If lead is `LOST`/`WON`/converted/opted-out → terminate immediately, cancel the journey, persist "skipped: terminal_state". **No message.**
  - Else pick the model tier: `nurture_step`/`re_engage` → `claude-haiku-4-5`; `incoming_message` with active negotiation → `claude-sonnet-4-6`; escalate to `claude-opus-4-8` only on complex multi-constraint reasoning. Make `config.agent_model` a per-run override resolved here.
- Test: terminal-state lead on a `nurture_step` trigger → zero sends.

**Phase 2 acceptance:** a reply cancels pending drips; terminal/opted-out leads never get proactive messages; routine drips run on Haiku.

---

## PHASE 3 — Durable long-horizon memory

**Goal:** coherent messaging across weeks without reloading 20 raw messages each time.

- Keep the agent-never-touches-DB principle: store a compact **lead memory summary** via the backend, not a direct LangGraph Postgres checkpointer.
  - `schema.prisma`: add `Lead.agentMemory Json?` (or a `LeadMemory` model) holding `{ summary, keyFacts, objections, lastSentiment, commitments, updatedAt }`.
  - `backend_client`: `get_lead_memory(leadId)` / `put_lead_memory(leadId, memory)`.
- Add a **summarize node** at end of graph: fold the new turn into the running summary (cheap Haiku call) and persist via backend. `_load_context` feeds the summary (not raw 20 messages) into the system prompt, plus only the last ~6 raw messages for immediate context.
- Test: after N turns, the prompt contains the summary and bounded recent history, not all N messages.

**Phase 3 acceptance:** prompt token size is bounded regardless of conversation age; a re-engage message references prior facts from the summary.

---

## PHASE 4 — Observability, online-eval guardrail, autonomy ramp

**Goal:** earn trust before full autonomy; make agent behavior debuggable.

### 4.1 Tracing
- Integrate **Langfuse** (self-hostable; fits per-deploy privacy) in `agent-service`, env-gated (`LANGFUSE_*`). Trace the full per-lead thread (load → decisions → tool calls → persist). No-op cleanly if env unset.

### 4.2 Online-eval guardrail node
- Before any `send_message` actually dispatches, run a fast **LLM-as-judge** (Haiku) policy/brand/safety check on the drafted text. On fail → block the send, escalate to human, log the trace. This is a runtime guardrail, complementary to Phase 0's deterministic gate.

### 4.3 Autonomy ramp (config-driven)
- `BusinessSettings.autonomyLevel`: `shadow | approval | full`.
  - `shadow`: agent drafts proactive messages, persists them as `deliveryStatus:'shadow'`, does NOT send. Surfaced in dashboard for review.
  - `approval`: proactive sends create a `ConversationMessage` with `deliveryStatus:'awaiting_approval'`; a human approves via `POST /conversations/messages/:id/approve` → then it passes the policy gate and sends.
  - `full`: send directly (still through the policy gate).
- Reactive replies to an open 24h window may be allowed at a lower bar than cold proactive outreach — make the threshold configurable.
- Tests: `shadow` → zero real sends; `approval` → send only after approve.

**Phase 4 acceptance:** every run is traceable; a policy-violating draft is blocked; shadow/approval modes provably prevent unapproved sends.

---

## PHASE 5 — Retire n8n

Once Phases 0–4 are green and at parity:
- Remove workflows now owned by the agent/backend: `01-lead-intake, 02-whatsapp-incoming, 03-send-message, 04-followup-runner, 05-hot-lead-alert, 06-crm-push, 07-appointment-booking, 08-quote-request, 11-daily-summary, 12-error-alert`.
- **Keep** only external inbound webhooks that third parties call directly and that can't hit the backend: `09-payment-success`, `10-digital-download` (or migrate them to backend `/webhooks/*` and drop n8n entirely).
- Remove the n8n service from `docker-compose.yml` if nothing remains. Update README architecture diagram.

**Phase 5 acceptance:** the full lead lifecycle (capture → nurture drip across days → reply handling → book → convert → re-engage) runs with **no n8n**, driven by the scheduler + agent + policy gate.

---

## Global "do NOT" list
- Do **not** use an in-process/in-memory scheduler (APScheduler with memory jobstore) — timers must be durable (BullMQ + `ScheduledAction`).
- Do **not** let the LLM bypass the policy gate — all sends go through `MessagePolicyService`.
- Do **not** let proactive runs fail open — if context load fails on a proactive trigger, abort and re-arm; never improvise with a blank brain. (Reactive replies may keep today's lenient behavior.)
- Do **not** schedule a drip without a `dedupeKey`, and do **not** leave pending drips alive after the lead engages.
- Do **not** read-modify-write `metadata` from the agent — use the atomic backend merge.
- Do **not** delete the idempotency key on success — keep it for its TTL.

## Definition of done
All phases committed separately; backend `npm run build && npm test` and agent `pytest` green; CI green; a documented end-to-end demo (script or test) showing a lead nurtured over simulated days with a reply mid-journey that cancels the pending drip, all sends passing the policy gate, and zero n8n involvement.
