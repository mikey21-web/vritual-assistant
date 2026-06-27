# Deployment Plan
_Last updated: 2026-06-21_

---

## Current Status

- **Production readiness audit:** 237/250 items complete (95%)
- **Remaining 13:** All external tooling / third-party accounts / business decisions — no code gaps
- **Branch:** `single-tenant-arch`

---

## Business Decision

**Option A — Agency Tool** (not SaaS)
- One deployment per client, separate VPS + DB per client
- Revenue model: monthly retainer / setup fee
- Evolve to SaaS later if demand proves it

---

## Demo Plan (This Week)

**Run everything locally on laptop** — show client from your machine.

No need for VPS during demo. Stack to run locally via Docker:

```
Your Laptop
├── NestJS backend       (Docker)
├── PostgreSQL           (Docker)
├── Redis                (Docker)
├── n8n                  (Docker — already running)
├── Dashboard            (Docker or npm run dev)
└── Python agent         (Docker or local)
```

### Next session TODO
1. Run `docker ps` to see what's already running
2. Start any missing services via docker-compose
3. Seed fake leads/contacts so dashboard looks populated
4. Do a full end-to-end test: lead in → score → CRM push → dashboard update
5. Fix anything broken before client meeting

---

## Oracle VPS (For After Client Signs)

- **Provider:** Oracle Cloud Free Tier (Always Free)
- **Region:** India South (Hyderabad)
- **IP:** `129.159.239.131`
- **Shape:** VM.Standard.E2.1.Micro (1 OCPU, 1GB RAM)
- **OS:** Ubuntu 22.04
- **State:** Running

### VPS setup TODO (after client signs)
1. SSH in: `ssh -i "your-key.key" ubuntu@129.159.239.131`
2. Add 2GB swap file (compensates for 1GB RAM)
3. Install Docker + Docker Compose
4. Open firewall ports: 80, 443, 22, 3000, 5432 (internal only)
5. Deploy backend + dashboard via docker-compose
6. Use n8n Cloud free tier (skip running n8n on 1GB server)
7. Point domain to 129.159.239.131
8. Set up Caddy for SSL + reverse proxy
9. Plug in real secrets (Sentry DSN, SendGrid, etc.)

### VCN already created
- VCN: `lead-automation-vcn` (10.0.0.0/16)
- Still need: Internet Gateway + public subnet + route rule (see notes below)

#### Remaining Oracle networking steps
1. Networking → Gateways → Create Internet Gateway (`lead-automation-igw`)
2. Routing → Default Route Table → Add rule: `0.0.0.0/0` → `lead-automation-igw`
3. Subnets → Create Subnet: `public-subnet`, `10.0.1.0/24`, public access

---

## External Accounts Still Needed (free)

| Service | Purpose | Status |
|---------|---------|--------|
| Sentry.io | Error tracking | Not set up |
| Resend or SendGrid | Transactional email | Not set up |
| Uptime Robot | Uptime monitoring | Not set up |
| Cloudflare | CDN + DNS | Not set up |
| n8n Cloud | Workflow automation (VPS deploy) | Not set up |

---

## Key Decisions Made

- **Cloud:** Oracle Free Tier (Hyderabad) for VPS
- **Billing:** Handle manually for first client, no Stripe needed yet
- **Multi-tenancy:** Single-tenant per deployment (one VPS per client)
- **Demo:** Local laptop, not VPS
- **n8n:** Local Docker for demo; n8n Cloud when deploying to VPS
