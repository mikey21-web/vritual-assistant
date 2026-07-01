# Architecture Overview

## System Architecture

```
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│  Dashboard   │─────▶│   Backend    │◀────▶│  PostgreSQL  │
│  (React SPA) │      │  (NestJS)    │      │              │
└──────────────┘      │              │      └──────────────┘
       │              │  ┌────────┐  │              │
       │              │  │ BullMQ │──┤──── ─ ─ ─ ─ ┘
       │              │  └───┬────┘  │
       │              │      │       │      ┌──────────────┐
       │              │  ┌───▼────┐  │─────▶│    Redis     │
       │              │  │ Agent  │  │      └──────────────┘
       │              │  │Service │  │
       │              │  │(Python)│  │
       │              │  └────────┘  │
       ▼              │      │       │      ┌──────────────┐
┌──────────────┐      │      └───────┼─────▶│    n8n       │
│   Nginx      │      └──────────────┘      └──────────────┘
│  (Reverse    │
│   Proxy)     │
└──────────────┘
```

## Data Flow

### Lead Intake
1. Lead form submission → Webhook → Backend
2. Contact lookup/creation (transactional)
3. Lead creation with metadata
4. Scoring rules evaluation
5. Optional: Agent trigger (async)

### WhatsApp Conversation
1. Inbound webhook → Backend → Contact lookup
2. Agent service triggered (async)
3. Agent processes via Claude AI
4. Response queued in Outbox
5. Outbox drained → WhatsApp API

## Entity Relationships

- **User** has many Leads (via assignment)
- **Contact** has many Leads
- **Lead** has many Conversations, Conversions, Tasks
- **Campaign** has many Leads
- **NurtureSequence** has many Steps
- **Integration** stores encrypted credentials per service

## Key Design Decisions

See [ADR-001](adr/001-single-tenant-architecture.md).
