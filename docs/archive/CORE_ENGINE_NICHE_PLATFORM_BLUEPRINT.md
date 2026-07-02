# Core Engine + Niche Templates — Platform Architecture v2

Date: 2026-06-19

## Decision (locked)

- **Composition model:** Pinned base image. The core engine is published as a **versioned Docker base image** (+ packages). Niche repos are thin overlays that build `FROM` it. No engine code is ever copied/forked.
- **Tenancy model:** **Single-tenant per deployment.** Each client gets their own repo + their own host + their own database. Multi-tenancy (`tenantId`, tenant middleware, `isPlatformAdmin`) is **removed**.

Why this shape: you get separate GitHub repos per niche, separate hosting, and 1-day spin-up — *without* the version drift of forking. Core fixes ship by bumping one image tag. Isolation becomes physical (per-deploy), which **deletes the entire class of cross-tenant security bugs** found in the audit.

---

## 1. Target topology

```
core-engine/                      ← ONE repo. Generic. Never forked.
  backend/        (NestJS)         → published as ghcr.io/<org>/core-backend:X.Y.Z
  agent-service/  (LangGraph)      → published as ghcr.io/<org>/core-agent:X.Y.Z
  dashboard/      (Vite/React)     → published as ghcr.io/<org>/core-dashboard:X.Y.Z
  CONFIG_CONTRACT.md              ← the niche schema (single source of truth)
  config.schema.json              ← JSON Schema, validated at boot + in CI

niche-template-starter/           ← GitHub TEMPLATE repo (scaffold source)
  niche.config.yaml               ← the only file an operator edits
  .env.example
  docker-compose.yml              ← references the 3 base images by tag
  .github/workflows/deploy.yml    ← validate config → build → deploy

niche-realestate/   (from starter) ┐
niche-eventmktg/    (from starter) ├─ thin overlays, hosted separately
niche-education/    (from starter) ┘
```

**Each client deployment = base images (pinned tag) + that client's `niche.config.yaml` + that client's `.env` + that client's Postgres.**

---

## 2. The config contract (already exists — formalize it)

The shape is already defined by `agent-service/app/niche_config.py::normalize_niche_config` and the existing `*.template.ts` files. Lift that into a versioned `niche.config.yaml` with a JSON Schema. Pack types (unchanged from today):

`custom_fields · lead_forms · campaigns · pipeline_stages · scoring_rules · routing_rules · automation_rules · message_templates · nurture_sequences · booking_settings · crm_mappings · conversion_goals · labels · branding · prompts · compliance`

```yaml
# niche.config.yaml  (client/niche specific)
schema_version: 1
core_engine_version: "1.4.2"        # pin — drives which base image tag deploys
niche:
  key: realestate-acme
  industry: real_estate
  display_name: "Acme Realty"
branding:
  logo_url: "https://..."
  primary_color: "#0B5"
  labels: { lead: "Buyer", leads: "Buyers" }
agent:
  model: claude-haiku-4-5            # cost tier per client
  tone_examples: ["Hi {name}! ..."]
  goals: ["Book a site visit", "Schedule a call"]
  compliance: ["DPDP: require explicit opt-in before messaging"]
packs:
  - type: custom_fields
    payload: { fields: [ ... ] }     # SAME shape as today's template packs
  - type: pipeline_stages
    payload: { stages: [ ... ] }
  - type: scoring_rules
    payload: { rules: [ ... ] }
  # ...etc
```

Rule: **the core engine never hardcodes a niche.** It only knows the contract. A niche repo only ever provides a valid `niche.config.yaml`.

---

## 3. How the core engine consumes config (replaces DB template install)

Today: master creates `NicheTemplate` rows → `apply()` writes records into a tenant.
New: **the engine seeds itself from `niche.config.yaml` at boot.**

- Add `backend/src/bootstrap/config-loader.service.ts`:
  - On startup, read `NICHE_CONFIG_PATH` (default `/app/niche.config.yaml`).
  - Validate against `config.schema.json` — **fail fast** if invalid (no half-configured deploy).
  - Reconcile into the DB **idempotently** by stable `key` (upsert custom fields, pipeline stages, scoring rules, templates, etc.). Re-running on redeploy converges, never duplicates.
- **Reuse `PackApplierService`** — it already turns packs into records. It just runs once at boot from the file instead of per-tenant from DB rows.
- The agent loads config from the same file/endpoint; `normalize_niche_config` already handles the `packs[]` shape, so **no agent rewrite** — just change the source from `/niche-templates/client/current` to the local config.

This makes config **declarative + idempotent**: the file is the desired state, boot reconciles to it. That's the GitOps reconcile-loop pattern, which is exactly how you avoid drift while keeping per-client deploys.

---

## 4. Composition (pinned base image)

`core-engine` CI builds & pushes versioned images on tag:
```
ghcr.io/<org>/core-backend:1.4.2
ghcr.io/<org>/core-agent:1.4.2
ghcr.io/<org>/core-dashboard:1.4.2
```

Niche repo `docker-compose.yml` (no engine source — just config):
```yaml
services:
  backend:
    image: ghcr.io/<org>/core-backend:${CORE_ENGINE_VERSION}
    volumes: [ "./niche.config.yaml:/app/niche.config.yaml:ro" ]
    env_file: .env
  agent:
    image: ghcr.io/<org>/core-agent:${CORE_ENGINE_VERSION}
    volumes: [ "./niche.config.yaml:/app/niche.config.yaml:ro" ]
    env_file: .env
  dashboard:
    image: ghcr.io/<org>/core-dashboard:${CORE_ENGINE_VERSION}
  postgres: { image: postgres:16-alpine, volumes: [pgdata:/var/lib/postgresql/data] }
  redis:    { image: redis:7-alpine }
```

**Upgrade a client = bump `CORE_ENGINE_VERSION` → redeploy.** Semantic versioning: patch = safe auto-bump; minor/major = test then roll. (Salesforce push-upgrade discipline: communicate, test against a clone, preserve existing behavior.)

---

## 5. Strip-tenancy migration (do in this order, each step shippable)

The current build is multi-tenant. Convert to single-tenant. **Branch first.** Each step keeps tests green.

1. **Snapshot + branch.** `git checkout -b single-tenant`. Tag current state.
2. **Boot-from-config loader** (Section 3) behind a flag. Prove a niche `.yaml` seeds a fresh DB correctly. Keep DB template system alive in parallel until parity.
3. **Remove tenant scoping from the data layer:**
   - Delete the `$use` tenant middleware in `prisma.service.ts`; delete `tenant-context.*`, `tenant.interceptor.ts`.
   - Prisma migration: drop `tenantId` columns + indexes + `Tenant` relations. (Single deploy = one implicit tenant; no column needed.)
   - Remove `Tenant`, `ClientTemplateInstallation`, `NicheTemplate`, `NicheTemplatePack` models (config file replaces them). Keep `PackApplierService`.
4. **Simplify auth/roles:** roles become real (OWNER/ADMIN/MANAGER/SALES_AGENT) within the single org — no platform-admin confusion. Registration is admin-invite only. Seed reads `SEED_OWNER_*` from env (already done).
5. **Dashboard → single-client:** drop master-vs-client views and the NicheTemplates admin pages; the niche is fixed per deploy. Branding/labels come from config.
6. **Delete dead code:** `niche-templates/` module + controller, tenants module, installation/upgrade/dryRun service code. Update `app.module.ts`.
7. **Publish base images** from `core-engine` CI; create `niche-template-starter`; migrate the two existing templates (`event-marketing-agency`, `real-estate`) into starter-based niche repos as `niche.config.yaml`.

> Net effect: ~all `tenantId` plumbing and the entire DB template-install/upgrade machinery is removed. The audit's cross-tenant write/read holes, the `isPlatformAdmin` escalation, the webhook tenant-spoofing, and the template-version-drift problems **all disappear by construction.**

---

## 6. The 1-day spin-up runbook (the goal)

```
1. gh repo create niche-dentists --template <org>/niche-template-starter
2. edit niche.config.yaml   (fields, stages, scoring, templates, prompts, branding)
3. set CORE_ENGINE_VERSION + secrets in .env
4. git push → CI: validate config.schema.json → deploy to its own host
5. Live, isolated, on its own domain.
```

CI **must** hard-fail on invalid config so a broken niche never deploys (replaces the old "publish-time validation" gap).

---

## 7. Fleet management (don't skip)

N deployments need a registry of "who runs what version" (Salesforce LMA equivalent):
- A tiny `fleet.yaml` (or a small control-plane table) listing each client: domain, `core_engine_version`, region, status.
- A dashboard/CLI that flags clients behind the latest core version → schedule rolling upgrades.
- Per-deploy health checks already exist (`/health/deep`) — aggregate them.

---

## 8. Keep / drop summary

| Keep | Drop |
|---|---|
| Core engine modules (leads, contacts, scoring, routing, nurture, booking, conversions, campaigns, forms, webhooks, agent) | `tenantId` everywhere + tenant middleware/interceptor/context |
| `PackApplierService` (now boot-time, file-driven) | `NicheTemplate` / `NicheTemplatePack` / `ClientTemplateInstallation` models + `niche-templates` module |
| Agent service + `normalize_niche_config` | DB `apply/upgrade/dryRun` lifecycle |
| Channel adapters, n8n workflows | Master-vs-client dashboard split, tenants module |
| Config contract (formalized) | Public/null-tenant auth paths |

---

## 9. Cross-cutting improvements to fold in (carried from audit/research)

- **Channel-agnostic consent/opt-out** in the core engine (DPDP: explicit opt-in, easy withdrawal, erasure). Applies to all channels, enforced before any send.
- **Agent observability + online-eval guardrails** (Langfuse self-hosted fits per-deploy privacy) — trace full threads; a pre-send guard node (consent + window + blocklist + PII).
- **Adapter resilience** (retry/backoff/circuit-breaker) + outbox between DB write and external send.
- **Per-deploy billing/metering** is simpler now — usage is per client by construction.
```
