# DeepSeek Build Prompt — AI Lead Conversation Agent (LangGraph + Python)
# The "Virtual Assistant" brain that talks to leads, qualifies, scores, books, and pushes to CRM

---

## CONTEXT — READ THIS FIRST

This repository is a **multi-tenant B2B lead automation SaaS**. It has:

- `backend/` — NestJS + TypeScript + Prisma + PostgreSQL + Redis/BullMQ. This is the **source of truth** (the brain for state). It already exposes a full REST API protected by JWT.
- `dashboard/` — Next.js 14 admin dashboard.
- `n8n/` — legacy automation workflows (being phased out — DO NOT build on n8n).
- `backend/src/niche-templates/` — a **niche template system**. Each industry (event marketing, real estate, etc.) is a config object that defines custom fields, scoring rules, message templates (tone), conversion goals, pipeline stages, and booking types for that industry. When a template is applied to a tenant, it creates real records for that tenant.

**Your job:** Build a NEW standalone Python microservice called `agent-service/` that is the **AI conversation brain**. When a lead sends a message (e.g. WhatsApp), this service:

1. Loads the lead's full context + conversation history from the NestJS backend.
2. Loads the tenant's **niche template config** (which defines what to collect, how to score, what tone to use, and what conversion goal to pursue).
3. Runs a **LangGraph agent loop** powered by Claude that decides — based on the live conversation — what to say next, what facts to extract, when to score, when to book an appointment, when to push to CRM, and when to escalate to a human.
4. Executes those decisions by calling back into the NestJS backend (which owns all state).

The NestJS backend stays the brain for STATE. The agent service is the brain for DECISIONS. n8n is not involved.

---

## CRITICAL RULES — DO NOT BREAK THESE

1. **The agent NEVER writes to the database directly.** All reads and writes go through the NestJS REST API. The Python service holds no database connection.
2. **The agent is config-driven, not hardcoded.** It must NOT contain event-marketing logic, real-estate logic, or any industry-specific behavior. All industry behavior comes from the niche template config loaded at runtime. The same code serves every tenant.
3. **Use Claude via LangGraph.** Use `langgraph` for the state machine and `langchain-anthropic` (`ChatAnthropic`) for the model. The model ID must come from an environment variable (`AGENT_MODEL`), defaulting to `claude-sonnet-4-6`.
4. **Every tool the agent uses is an HTTP call to NestJS.** No tool touches the database, sends a real WhatsApp message itself, or calls a CRM directly — it asks NestJS to do it.
5. **Authentication between services uses a service JWT.** The agent service authenticates to NestJS using a long-lived service token from the env var `AGENT_SERVICE_JWT` (sent as `Authorization: Bearer <token>`). This mirrors the existing `N8N_BACKEND_JWT` pattern in `docker-compose.yml`.
6. **The service must be safe.** Never invent a successful tool result. If a backend call fails, the tool returns an explicit error to the agent so it can react (retry, escalate, or stop). Never fabricate that a message was sent or an appointment was booked.
7. **Idempotency.** A given inbound message (identified by a `messageId` / `triggerId`) must not cause duplicate replies. Track processed trigger IDs.
8. **Type everything.** Use Pydantic models for all request/response bodies and for the agent state. No bare dicts crossing function boundaries where a model fits.
9. **The service runs as a container** added to the existing `docker-compose.yml`.

---

## ARCHITECTURE & FLOW

```
  Lead sends WhatsApp message
            │
            ▼
  NestJS  POST /webhooks/whatsapp   (already exists — validates signature, stores message, emits event)
            │  (NEW) after storing the inbound message, NestJS fires:
            ▼
  POST  http://agent-service:8000/agent/run
        { tenantId, leadId, triggerId, channel, trigger: "inbound_message" }
            │
            ▼
  ┌─────────────────────────  agent-service (Python, FastAPI + LangGraph)  ─────────────────────────┐
  │                                                                                                   │
  │  1. load_context node   → GET NestJS: lead, contact, conversation history, niche config           │
  │  2. agent node (Claude) → decides next action(s) using tools, guided by niche config              │
  │  3. tools node          → each tool = HTTP call back to NestJS                                     │
  │     (send_message, extract_fields, update_score, update_status, set_segment, assign_agent,        │
  │      create_task, book_appointment, push_to_crm, record_conversion, mark_lost, escalate_to_human) │
  │  4. loop agent⇄tools until the agent ends its turn (no more tool calls)                            │
  │  5. persist node        → POST a run summary back to NestJS for observability                      │
  │                                                                                                   │
  └───────────────────────────────────────────────────────────────────────────────────────────────────┘
            │
            ▼
  NestJS executes each action (sends the real WhatsApp reply, updates score, books via calendar
  adapter, pushes via CRM adapter, writes timeline + events). NestJS owns all state.
```

The agent never blocks the user. `POST /agent/run` returns `202 Accepted` immediately and processes the run in the background (FastAPI `BackgroundTasks` or an internal task queue). The reply reaches the lead when the agent calls the `send_message` tool.

---

## PROJECT STRUCTURE TO CREATE

```
agent-service/
  pyproject.toml
  Dockerfile
  .env.example
  README.md
  app/
    __init__.py
    main.py                 # FastAPI app + endpoints
    config.py               # env-driven settings (pydantic-settings)
    schemas.py              # Pydantic request/response + AgentState models
    backend_client.py       # typed HTTP client for the NestJS API (all reads/writes)
    niche_config.py         # loads + normalizes the tenant niche config into agent guidance
    prompt.py               # builds the system prompt from the niche config
    tools.py                # LangChain tools — each wraps a backend_client call
    graph.py                # LangGraph StateGraph: load_context → agent ⇄ tools → persist
    runner.py               # orchestrates one agent run (entry point used by main.py)
    idempotency.py          # in-memory + Redis-backed processed-trigger tracking
    logging_config.py       # structured logging with correlation IDs
  tests/
    __init__.py
    conftest.py
    test_tools.py
    test_niche_config.py
    test_prompt.py
    test_graph.py
    test_runner_idempotency.py
    test_backend_client.py
```

---

## DEPENDENCIES (`pyproject.toml`)

Use Python 3.11+. Manage with `uv` or plain pip. Required packages:

```
fastapi
uvicorn[standard]
langgraph
langchain-anthropic
langchain-core
pydantic>=2
pydantic-settings
httpx
redis
tenacity              # retries on backend calls
structlog             # structured logging
```

Dev/test:
```
pytest
pytest-asyncio
respx                 # mock httpx calls in tests
```

---

## FILE-BY-FILE SPECIFICATION

### `app/config.py`

Use `pydantic-settings`. Settings (all from env):

```python
class Settings(BaseSettings):
    backend_api_url: str            # e.g. http://backend:3001
    agent_service_jwt: str          # service token for calling NestJS
    anthropic_api_key: str          # ANTHROPIC_API_KEY
    agent_model: str = "claude-sonnet-4-6"
    agent_max_tokens: int = 2048
    redis_url: str | None = None    # for idempotency; optional (falls back to in-memory)
    max_agent_steps: int = 12       # hard cap on agent⇄tool loops per run
    request_timeout_seconds: float = 20.0
    port: int = 8000

    model_config = SettingsConfigDict(env_file=".env", env_prefix="")
```

Map env names explicitly: `BACKEND_API_URL`, `AGENT_SERVICE_JWT`, `ANTHROPIC_API_KEY`, `AGENT_MODEL`, `REDIS_URL`, etc.

### `app/schemas.py`

Pydantic models:

```python
class AgentRunRequest(BaseModel):
    tenantId: str
    leadId: str
    triggerId: str            # unique id for this inbound event (for idempotency)
    channel: str              # "WHATSAPP" | "EMAIL" | ...
    trigger: str              # "inbound_message" | "lead_created" | "followup_due"
    messageText: str | None = None   # the incoming message text, if any

class AgentRunResponse(BaseModel):
    accepted: bool
    runId: str

class CollectedField(BaseModel):
    key: str
    value: str

# The LangGraph state (use a TypedDict for LangGraph compatibility, mirrored by a Pydantic view)
class AgentState(TypedDict, total=False):
    tenant_id: str
    lead_id: str
    trigger_id: str
    channel: str
    trigger: str
    incoming_text: str | None
    lead_context: dict          # lead + contact + custom fields
    conversation: list[dict]    # prior messages [{role, text, direction, channel}]
    niche_config: dict          # normalized niche guidance
    messages: list              # LangChain message objects (the running agent transcript)
    steps: int                  # loop counter
    actions_taken: list[dict]   # audit of tool calls + results
    run_id: str
```

### `app/backend_client.py`

A typed async client wrapping `httpx.AsyncClient`. Every method sends `Authorization: Bearer {settings.agent_service_jwt}` and `Content-Type: application/json`. Use `tenacity` to retry idempotent GETs (not POSTs) up to 3 times on 5xx/timeout. On non-2xx, raise a typed `BackendError(status, message, endpoint)`.

Methods (map to EXISTING NestJS endpoints — verify these paths against `backend/src` before coding; adjust to the real routes):

| Method | NestJS endpoint | Purpose |
|---|---|---|
| `get_lead(lead_id)` | `GET /leads/:id` | lead + contact + conversations + conversions + tasks |
| `get_lead_timeline(lead_id)` | `GET /leads/:id/timeline` | human-readable history |
| `get_conversation(lead_id)` | `GET /conversations?leadId=:id` (or from `get_lead`) | message history |
| `get_niche_config(tenant_id)` | `GET /client-template/current` (send tenant context via the service JWT / header) | the installed niche config for this tenant |
| `send_message(lead_id, channel, text, template_id?)` | `POST /conversations/messages` | queue/send an outbound message |
| `update_custom_fields(lead_id, fields)` | `PATCH /leads/:id` and/or the custom-field-value endpoint | save extracted facts |
| `update_score(lead_id, delta, reason)` | `POST /leads/:id/score` | adjust score (verify route) |
| `update_status(lead_id, status)` | `PATCH /leads/:id` | move pipeline stage |
| `set_segment(lead_id, segment)` | `PATCH /leads/:id` | HOT/WARM/COLD |
| `assign_agent(lead_id)` | `POST /leads/:id/assign` | route to a human (verify route) |
| `create_task(lead_id, title, due_at?)` | `POST /tasks` | follow-up task |
| `book_appointment(lead_id, booking_type)` | `POST /leads/:id/conversions` with destination APPOINTMENT_BOOKING (verify) | request a booking |
| `push_to_crm(lead_id, mapping_id?)` | `POST /crm-mappings/:id/push` or `POST /leads/:id/conversions` with CRM_QUALIFIED_PUSH | push to CRM |
| `record_conversion(lead_id, destination)` | `POST /leads/:id/conversions` | record a conversion |
| `post_run_summary(payload)` | `POST /agent/run-summary` (NEW endpoint — see NestJS section) | observability |

**IMPORTANT:** Before writing this file, open `backend/src` and confirm the real route + body shape for each action (score, assign, conversions, custom fields). Use the actual DTOs. If a needed endpoint does not exist, list it in the README under "NestJS endpoints required" rather than silently faking it.

### `app/niche_config.py`

Takes the raw niche config object returned by `GET /client-template/current` and normalizes it into a compact "agent guidance" dict the prompt can use:

```python
def normalize_niche_config(raw: dict) -> dict:
    return {
        "industry": raw.get("industry"),
        "display_name": raw.get("name"),
        "fields_to_collect": [...],     # from customFields: [{key, label, type, options, required}]
        "scoring_signals": [...],       # from scoringRules: human-readable "budget>$15K → hot"
        "conversion_goals": [...],      # from conversionGoals: the objectives
        "pipeline_stages": [...],       # ordered stage names
        "booking_types": [...],         # from bookingSettings
        "tone_examples": [...],         # from messageTemplates: 3-5 example bodies for voice
        "labels": {...},                # dashboard_labels (e.g. "Event Lead")
    }
```

If config is missing/unavailable, return a safe generic default (collect name/intent/budget/timeline; goal = book a call) so the agent still functions. Never crash on missing config.

### `app/prompt.py`

`build_system_prompt(niche: dict, lead_context: dict) -> str`. Construct a system prompt that turns the niche config into the agent's instructions. It must instruct the agent to:

- Act as a friendly, professional assistant for a `{niche['display_name']}` business.
- Have a natural conversation over `{channel}`; ask ONE question at a time; never interrogate.
- **Collect these facts** when they come up naturally: `{fields_to_collect}` — and call `extract_fields` to save them as soon as the lead reveals them.
- **Score the lead** using `update_score` based on these signals: `{scoring_signals}`.
- **Pursue this goal**: move the lead toward `{conversion_goals}` (e.g. book a `{booking_types}` call). When the lead is ready, call `book_appointment`.
- When the lead is qualified (high score / key fields collected), call `push_to_crm` and `update_status` to the appropriate `{pipeline_stages}` stage.
- Match this voice (examples): `{tone_examples}`.
- If the lead is hostile, asks for a human, or hits something the agent can't handle, call `escalate_to_human` and stop.
- If the lead is clearly not interested or unqualified after reasonable effort, call `mark_lost` with a reason.
- NEVER claim an action happened unless the corresponding tool returned success.
- Keep replies short and channel-appropriate (WhatsApp = short, friendly; Email = slightly longer).
- Include compliance notes when the industry needs them (e.g. healthcare/financial/legal niches must add disclaimers — read these from the niche config if present and never give regulated advice).

Keep the prompt tight and put the volatile per-lead context (current fields, last messages) at the END so prompt caching of the stable instructions works.

### `app/tools.py`

Define LangChain tools (use `@tool` from `langchain_core.tools`, or `StructuredTool`) — one per backend action. Each tool:
- Has a clear name + description (the agent reads these to decide when to call) stating WHEN to use it.
- Has a typed args schema (Pydantic).
- Calls the matching `backend_client` method.
- Returns a short string result: `"ok: ..."` on success or `"error: ..."` on failure. Never raise out of a tool — convert exceptions to `"error: ..."` strings so the agent can react.

Tools to implement (names the agent will see):

```
send_message(text: str, template_id: str | None)
extract_fields(fields: list[CollectedField])
update_score(delta: int, reason: str)
update_status(status: str)
set_segment(segment: str)
assign_agent(reason: str)
create_task(title: str, due_in_hours: int | None)
book_appointment(booking_type: str)
push_to_crm()
record_conversion(destination: str)
mark_lost(reason: str)
escalate_to_human(reason: str)
```

Each tool needs the current `lead_id` / `tenant_id` — inject these via a closure/factory `build_tools(ctx: ToolContext)` that captures the backend client + lead/tenant IDs for this run. Do not make the model pass `lead_id` (it shouldn't control which lead it's acting on).

### `app/graph.py`

Build a LangGraph `StateGraph(AgentState)`:

- **Node `load_context`**: calls backend_client to fetch lead, conversation history, and niche config; normalizes config; builds the system prompt; seeds `state["messages"]` with the system prompt + the conversation history rendered as alternating human/assistant turns + the new incoming message as the latest human turn.
- **Node `agent`**: binds the tools to `ChatAnthropic(model=settings.agent_model, max_tokens=settings.agent_max_tokens, anthropic_api_key=...)` via `.bind_tools(tools)` and invokes it on `state["messages"]`. Appends the AI message to state. Increments `state["steps"]`.
- **Conditional edge from `agent`**: if the AI message has tool calls AND `state["steps"] < max_agent_steps` → go to `tools`; else → go to `persist`.
- **Node `tools`**: executes each tool call (use LangGraph's `ToolNode` or a manual executor), appends ToolMessages with results to `state["messages"]`, records each in `state["actions_taken"]`, then routes back to `agent`.
- **Node `persist`**: posts a run summary (`run_id`, lead_id, actions_taken, final state) to the backend for observability.

Compile the graph. Expose `async def run_agent(state: AgentState) -> AgentState`.

Use Claude tool-use correctly: `ChatAnthropic` with `bind_tools`. Model id from settings. Adaptive thinking is fine to leave default. Keep `max_tokens` modest (replies are short).

### `app/runner.py`

```python
async def execute_run(req: AgentRunRequest) -> str:
    run_id = new_uuid()
    if await idempotency.already_processed(req.triggerId):
        return run_id  # skip duplicate
    await idempotency.mark_processing(req.triggerId)
    initial_state = build_initial_state(req, run_id)
    try:
        await graph.run_agent(initial_state)
    finally:
        await idempotency.mark_done(req.triggerId)
    return run_id
```

### `app/idempotency.py`

If `REDIS_URL` is set, use Redis with a TTL (e.g. 24h) keyed `agent:trigger:{triggerId}`. Otherwise fall back to an in-memory set (single-instance dev). Methods: `already_processed`, `mark_processing`, `mark_done`.

### `app/main.py`

FastAPI app with:
- `POST /agent/run` → validates `AgentRunRequest`, schedules `execute_run` via `BackgroundTasks`, returns `202` + `AgentRunResponse(accepted=True, runId=...)`. **Auth: require a shared secret header** `x-agent-key` matching env `AGENT_INBOUND_KEY` (so only NestJS can trigger runs).
- `GET /health` → `{"status": "ok"}` (no auth).
- `GET /health/deep` → checks it can reach the backend (`GET {backend}/health`) and that the model key is present.

Structured logging with a per-run correlation id.

### `app/Dockerfile`

Python 3.11-slim, install deps, copy app, run `uvicorn app.main:app --host 0.0.0.0 --port 8000`. Expose 8000. Run as non-root.

---

## NESTJS SIDE — REQUIRED CHANGES (in `backend/`)

These are the integration points. Keep them minimal and follow existing patterns (DTOs, guards).

### 1. Trigger the agent on inbound messages
In the WhatsApp webhook handler (`backend/src/webhooks/`), AFTER the inbound message is stored and the event emitted, fire-and-forget an HTTP POST to the agent service:

```
POST {AGENT_SERVICE_URL}/agent/run
headers: { "x-agent-key": AGENT_INBOUND_KEY }
body: { tenantId, leadId, triggerId: <messageId>, channel: "WHATSAPP", trigger: "inbound_message", messageText }
```

Use a small `AgentClientService` (HttpModule). Do not block the webhook response on it. Add env vars `AGENT_SERVICE_URL` and `AGENT_INBOUND_KEY`.

### 2. Client-safe niche config endpoint
Ensure `GET /client-template/current` exists (the niche template guide specifies it). It must return the **installed** niche config for the calling tenant (custom fields, scoring rules, message templates, conversion goals, pipeline stages, booking settings, labels) — NOT the master template library. If it doesn't exist yet, create it in `backend/src/niche-templates/`.

### 3. Run-summary endpoint (observability)
Add `POST /agent/run-summary` accepting `{ runId, leadId, tenantId, actions, model, startedAt, finishedAt }`. Store it (reuse the existing event/timeline system — emit a `agent.run_completed` SystemEvent and a TimelineItem summarizing what the agent did). Protect with the service JWT (same guard as other authenticated routes).

### 4. Service auth
Issue a long-lived **service JWT** for a system user with a role that has permission to perform the agent's actions (send messages, update leads, create tasks, request conversions). Put it in `AGENT_SERVICE_JWT`. The agent service sends it as `Authorization: Bearer`. Confirm the existing guards accept it. (This mirrors the existing `N8N_BACKEND_JWT` pattern.)

### 5. Verify the action endpoints exist
Confirm these exist and note any that don't (the agent depends on them): `POST /leads/:id/score`, `POST /leads/:id/assign`, `POST /conversations/messages`, `POST /leads/:id/conversions`, `PATCH /leads/:id`, `POST /tasks`, `POST /crm-mappings/:id/push`. If any are missing, implement them following the existing controller/DTO/permission pattern.

---

## DOCKER COMPOSE — ADD THE SERVICE

Add to `docker-compose.yml` (do not remove existing services):

```yaml
  agent-service:
    build:
      context: ./agent-service
      dockerfile: Dockerfile
    container_name: lead-automation-agent
    restart: unless-stopped
    ports:
      - "8000:8000"
    environment:
      BACKEND_API_URL: http://backend:3001
      AGENT_SERVICE_JWT: ${AGENT_SERVICE_JWT:?AGENT_SERVICE_JWT must be set}
      AGENT_INBOUND_KEY: ${AGENT_INBOUND_KEY:?AGENT_INBOUND_KEY must be set}
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY:?ANTHROPIC_API_KEY must be set}
      AGENT_MODEL: ${AGENT_MODEL:-claude-sonnet-4-6}
      REDIS_URL: redis://redis:6379
      PORT: 8000
    depends_on:
      - backend
      - redis
```

Also add to the `backend` service environment: `AGENT_SERVICE_URL: http://agent-service:8000` and `AGENT_INBOUND_KEY: ${AGENT_INBOUND_KEY}`.

Add the new vars to `.env.example` at the repo root: `AGENT_SERVICE_JWT`, `AGENT_INBOUND_KEY`, `ANTHROPIC_API_KEY`, `AGENT_MODEL`.

---

## MODEL & COST NOTES (leave this in the README)

- `AGENT_MODEL` controls cost/quality. Recommended tiers:
  - `claude-haiku-4-5` — cheapest ($1/$5 per 1M tokens), good for routine conversational turns.
  - `claude-sonnet-4-6` — DEFAULT ($3/$15), best balance for an agent that books and pushes CRM.
  - `claude-opus-4-8` — highest quality ($5/$25) for the hardest reasoning.
- Replies are short, so per-conversation cost is typically a few cents or less.
- Keep the stable instructions at the top of the prompt and per-lead context at the bottom so prompt caching reduces cost on multi-turn conversations.

---

## TESTS (required)

Use `pytest` + `pytest-asyncio` + `respx` (to mock the NestJS HTTP API). Do NOT call the real Anthropic API in tests — mock `ChatAnthropic` to return canned tool-call sequences.

- `test_backend_client.py`: each method hits the right URL with the Bearer header; 5xx triggers retry on GETs; non-2xx raises `BackendError`.
- `test_niche_config.py`: a raw event-marketing config normalizes correctly; missing config returns the safe default; malformed config does not crash.
- `test_prompt.py`: the system prompt includes the fields to collect, the conversion goal, and the tone examples from the niche config.
- `test_tools.py`: each tool calls the right backend method and returns `"ok: ..."`; a backend error becomes `"error: ..."` (never raises).
- `test_graph.py`: with a mocked model that (a) calls `extract_fields` then `send_message` then ends → the graph runs load_context → agent → tools → agent → persist and records the actions; (b) respects `max_agent_steps` (a model that always calls a tool stops at the cap).
- `test_runner_idempotency.py`: the same `triggerId` processed twice runs the graph only once.

---

## VERIFICATION COMMANDS

```bash
# Python service
cd agent-service
pip install -e .            # or: uv sync
python -c "import app.main"  # imports cleanly
pytest -q                    # all tests pass
python -c "from app.graph import build_graph; build_graph(); print('graph compiles')"

# Backend (after the NestJS changes)
cd backend
npx prisma validate
npx tsc --noEmit --incremental false
npm test -- --runInBand
npm run build

# Compose builds
docker compose build agent-service
docker compose config   # validates the compose file with the new service
```

All must pass. The agent service must import, the graph must compile, and all Python tests must pass without hitting the real Anthropic or backend APIs.

---

## FINAL DELIVERABLES CHECKLIST

**agent-service/ (Python):**
- [ ] `pyproject.toml`, `Dockerfile`, `.env.example`, `README.md`
- [ ] `app/config.py` — env-driven settings
- [ ] `app/schemas.py` — Pydantic + AgentState
- [ ] `app/backend_client.py` — typed NestJS client, all actions, Bearer auth, retries on GET
- [ ] `app/niche_config.py` — normalize niche config + safe default
- [ ] `app/prompt.py` — system prompt built from niche config
- [ ] `app/tools.py` — 12 tools, each wraps a backend call, never raises
- [ ] `app/graph.py` — LangGraph load_context → agent ⇄ tools → persist
- [ ] `app/runner.py` + `app/idempotency.py` — run orchestration + dedupe
- [ ] `app/main.py` — FastAPI: POST /agent/run (202), GET /health, GET /health/deep
- [ ] `tests/` — all test files above, passing, no live API calls

**backend/ (NestJS):**
- [ ] Webhook fires `POST /agent/run` to the agent service after storing an inbound message
- [ ] `GET /client-template/current` returns the tenant's installed niche config
- [ ] `POST /agent/run-summary` stores a run summary (SystemEvent + TimelineItem)
- [ ] Service JWT (`AGENT_SERVICE_JWT`) works against existing guards
- [ ] All agent action endpoints confirmed to exist (or implemented)
- [ ] Backend builds + tests pass

**infra:**
- [ ] `agent-service` added to `docker-compose.yml`; backend gets `AGENT_SERVICE_URL` + `AGENT_INBOUND_KEY`
- [ ] New env vars in root `.env.example`
- [ ] `docker compose config` validates

---

## WHAT NOT TO DO

- Do NOT give the Python service a database connection. All state goes through NestJS.
- Do NOT hardcode any industry logic. Behavior comes from the niche config.
- Do NOT build on n8n or call n8n.
- Do NOT let a tool fabricate success. A failed backend call returns an explicit error.
- Do NOT block the webhook or the `/agent/run` response on the full agent loop — run it in the background.
- Do NOT call the real Anthropic API in tests.
- Do NOT change the Prisma schema or existing dashboard pages for this task.

---

## START HERE

1. Read `backend/src/leads/`, `backend/src/conversations/`, `backend/src/conversions/`, `backend/src/tasks/`, `backend/src/crm-mappings/` to confirm the exact action routes and DTOs the agent will call.
2. Read `backend/src/niche-templates/` and `backend/src/niche-templates/templates/event-marketing-agency.template.ts` to understand the niche config shape the agent consumes.
3. Read `docker-compose.yml` and `.env.example` for the service-auth pattern (`N8N_BACKEND_JWT`).
4. Build `agent-service/` in this order: config → schemas → backend_client → niche_config → prompt → tools → graph → runner → main. Run the Python verification after each of backend_client, tools, and graph.
5. Make the NestJS changes (webhook trigger, `/client-template/current`, `/agent/run-summary`, service JWT).
6. Add the compose service and env vars. Run all verification commands.
