# AI Lead Conversation Agent

LangGraph-powered AI agent that handles WhatsApp/email conversations with leads. Loads tenant-specific niche config at runtime, scores leads, extracts fields, books appointments, pushes to CRM.

## Architecture

```
Lead message → NestJS webhook → Agent Service (POST /agent/run) → LangGraph loop → NestJS actions
```

The agent never touches a database. All state reads/writes go through the NestJS REST API.

## Quick Start

```bash
pip install -e .
cp .env.example .env  # fill in ANTHROPIC_API_KEY, AGENT_SERVICE_JWT, AGENT_INBOUND_KEY
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## API Endpoints

- `POST /agent/run` — Accepts `AgentRunRequest`, processes in background, returns `202`
- `GET /health` — `{"status": "ok"}`
- `GET /health/deep` — Checks backend connectivity + model key presence

## Model Tiers

| Model | Cost per 1M tokens | Best for |
|---|---|---|
| `claude-haiku-4-5` | $1 / $5 | Routine conversational turns |
| `claude-sonnet-4-6` | $3 / $15 (DEFAULT) | Balanced agent (CRM + booking) |
| `claude-opus-4-8` | $5 / $25 | Hardest reasoning |

Replies are short, so per-conversation cost is typically a few cents.

## NestJS Requirements

If endpoints are missing, add them following the existing controller/DTO/permission pattern:

- `GET /client-template/current?clientKey=X` — Returns tenant's installed niche config with fields/rules/templates/goals
- `POST /agent/run-summary` — Stores agent run results as SystemEvent + TimelineItem
- Agent-triggered webhook in `backend/src/webhooks/` after message storage
- Service JWT (`AGENT_SERVICE_JWT`) that works against existing auth guards

## Running Tests

```bash
pip install -e ".[dev]"
pytest -q
```
