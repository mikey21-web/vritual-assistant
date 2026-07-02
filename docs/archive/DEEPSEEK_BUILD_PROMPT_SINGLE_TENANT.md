# BUILD TASK — Complete the single-tenant migration of an AI lead-automation platform

You are a senior full-stack engineer. You are working in an existing monorepo on the git branch `single-tenant-arch`. **Do not start from scratch — extend the existing code.** Read before you write. Every change must keep the existing test suite (87 passing Jest tests) green and both builds clean.

---

## 0. CONTEXT — what this codebase is

A multi-channel AI lead-automation platform being converted **from multi-tenant SaaS to single-tenant-per-deployment**. Each client gets their own repo + host + Postgres. There is no `tenantId`, no tenant middleware, no platform-admin. The core engine is generic and is configured entirely by one file: `niche.config.yaml`, validated against `config.schema.json` at boot.

**Monorepo layout (paths are relative to repo root):**

```
backend/            NestJS + Prisma + BullMQ + Redis + Postgres   (REST API + agent intake)
dashboard-v2/       Vite + React + TanStack Query                 (single-client admin UI)
agent-service/      Python LangGraph agent                        (conversational AI)
scripts/            validate-niche.ts, backup/restore, verify-production
load-tests/         k6 webhook-intake.js
e2e/                Playwright (login.spec.ts + playwright.config.ts)
.github/workflows/  ci.yml
niche.config.yaml   the per-deploy config (the ONLY file an operator edits)
config.schema.json  JSON Schema for niche.config.yaml
docker-compose.yml  references the 3 service images
CORE_ENGINE_NICHE_PLATFORM_BLUEPRINT.md   the architecture spec — READ THIS FIRST
```

**Key backend modules already built:** `auth` (admin-invite registration, OWNER/ADMIN/MANAGER/SALES_AGENT roles), `leads`, `contacts`, `conversations`, `campaigns`, `forms`, `webhooks`, `scoring-rules`, `routing-rules`, `nurture-sequences`, `booking-settings`, `conversions`, `automation`, `automation-events`, `billing` (Stripe + Razorpay providers, 4 plans, usage metering), `compliance` (DPDP export/erasure), `integrations`, `bootstrap/config-loader.service.ts` (validates + seeds niche.config.yaml at boot via `PackApplierService`).

**Shared utilities:** `shared/circuit-breaker.ts`, `shared/adapters/sms.adapter.ts` (TwilioSmsAdapter), `shared/sentry.service.ts`, `shared/pack-applier.service.ts`, `shared/crypto.util.ts`, `shared/signed-url.service.ts`.

**Hard constraints (NON-NEGOTIABLE):**
- Never reintroduce `tenantId`, tenant middleware, tenant context, `isPlatformAdmin`, or any multi-tenant scoping.
- Roles are exactly: OWNER, ADMIN, MANAGER, SALES_AGENT (within the single org). No SUPPORT_AGENT/VIEWER, no platform-admin.
- The core engine never hardcodes a niche — it only knows the contract in `config.schema.json`.
- Config is declarative + idempotent: re-running boot reconciles to the file, never duplicates.
- Every secret/external-send path must fail safe (consent → blocklist → quiet hours → rate limit → dedup → channel window) before any outbound message.
- Match existing code style. Do not add new dependencies unless the task requires it; if you do, justify it.

---

## 1. TASKS — do them in this order. Each is independently shippable.

### TIER A — Close the holes in the current branch (highest priority)

**A1. Remove dead multi-tenant dashboard pages.**
- Delete `dashboard-v2/src/pages/ClientsPage.tsx` and `dashboard-v2/src/pages/NicheTemplatesPage.tsx`.
- Remove their `lazy()` imports and route entries from `dashboard-v2/src/App.tsx` (around lines 33 and 66), plus any sidebar/nav links to `/clients` or `/niche-templates`.
- Remove the now-orphaned data-layer functions from `dashboard-v2/src/lib/data.ts`: `fetchTenants`, `createTenant`, `deleteTenant`, `provisionTenant`, `fetchNicheTemplates`, `fetchInstallations`, `publishTemplate`, `applyTemplate`, `dryRunTemplate` — **only if** no other surviving page imports them (grep first).
- Remove the `Tenant` type from `dashboard-v2/src/lib/types.ts` if unused.
- **Acceptance:** `cd dashboard-v2 && npx tsc --noEmit && npm run build` passes with zero references to tenants/niche-templates.

**A2. Wire `TwilioSmsAdapter` into the engine (currently dead code).**
- `backend/src/shared/adapters/sms.adapter.ts` defines `TwilioSmsAdapter implements SmsAdapter` but it is not registered in any module and never injected.
- Register it as a provider in `backend/src/shared/shared.module.ts` (export it).
- Inject it where outbound messages are dispatched (find the send path in `conversations` / `automation` / `message-policy` service) and route channel `sms` through it, **after** the existing `MessagePolicyService` guard chain (opt-out → blocklist → quiet hours → rate limit → dedup → window). SMS must never bypass consent.
- Add a unit spec `sms.adapter.spec.ts` covering: not-configured → simulated success; configured + send success; send failure returns `{success:false,error}`.
- **Acceptance:** new spec passes; existing 87 tests still green; `npm run build` clean.

**A3. Wire config validation into CI + add this branch to triggers.**
- In `.github/workflows/ci.yml`: add `single-tenant-arch` to both the `push` and `pull_request` branch lists.
- Add a new job (or step) that runs `npx ts-node scripts/validate-niche.ts` against `niche.config.yaml` and **hard-fails** the build on invalid config. It must validate against `config.schema.json`.
- **Acceptance:** the workflow is valid YAML; the validate step fails the run when given an intentionally broken config and passes on the real one.

**A4. Remove the `tenant-context.service.ts` backward-compat shim.**
- `backend/src/shared/tenant-context.service.ts` is a dead single-tenant shim. Grep for every importer, remove the injections and the now-unused `tenantId` references they feed, then delete the file and its provider registration.
- If any service still genuinely needs a stable deployment identifier, replace it with a value read from `niche.config.yaml` (`niche.key`), not a tenant abstraction.
- **Acceptance:** build clean, tests green, zero references to `tenant-context` or `TenantContextService`.

**A5. Implement the stubbed integration health check.**
- `backend/src/integrations/integrations.service.ts:109` returns `'Health check not implemented for this integration type'`. Implement real lightweight health probes (auth-ping / token-validity) for the integration types actually supported, using the existing `CircuitBreaker` for the outbound call. Leave a typed `unsupported` result only for types that genuinely have no probe.
- **Acceptance:** unit test covering one healthy + one failing probe.

### TIER B — Blueprint features not yet started

**B1. Base-image publish pipeline.**
- Add `.github/workflows/release.yml` that, on git tag `v*.*.*`, builds and pushes three images to GHCR: `core-backend`, `core-agent`, `core-dashboard`, each tagged with the semver **and** `latest`. Use `docker/build-push-action`, `docker/metadata-action`, GHCR login via `GITHUB_TOKEN`. Each service must have a production `Dockerfile` (multi-stage; create them if missing — backend: node build → `node dist/main`; dashboard: vite build → nginx static; agent: python slim).
- **Acceptance:** workflow lints; Dockerfiles build locally (`docker build`).

**B2. `niche-template-starter` scaffold (inside this repo as a template directory `niche-template-starter/`).**
- Contains: `niche.config.yaml` (minimal valid example), `.env.example` (every required secret with placeholder), `docker-compose.yml` referencing the 3 base images by `${CORE_ENGINE_VERSION}` tag with the config mounted read-only, and `.github/workflows/deploy.yml` (validate config → pull images → deploy). No engine source code — config only.
- A `README.md` with the 1-day spin-up runbook (create repo from template → edit config → set secrets → push → live).
- **Acceptance:** the starter's `niche.config.yaml` passes `scripts/validate-niche.ts`; compose file is valid.

**B3. Migrate the two existing niches to `niche.config.yaml`.**
- Find the existing niche definitions (search for `event-marketing-agency` and `real-estate`, likely `*.template.ts` files or the agent's `niche_config.py`). Convert each into a complete, schema-valid `niche.config.yaml` under `niches/event-marketing-agency/` and `niches/real-estate/`. Preserve every pack: custom_fields, lead_forms, campaigns, pipeline_stages, scoring_rules, routing_rules, automation_rules, message_templates, nurture_sequences, booking_settings, crm_mappings, conversion_goals, labels, branding, prompts, compliance.
- **Acceptance:** both pass `scripts/validate-niche.ts`; booting `config-loader.service.ts` against each seeds a fresh DB with no errors and is idempotent on re-run.

**B4. Fleet management.**
- Add `fleet.yaml` (registry: per-client `domain`, `core_engine_version`, `region`, `status`) and a small CLI `scripts/fleet-status.ts` that reads it, queries each deploy's `/health/deep`, and flags any client behind the latest `core_engine_version`. Output a table.
- **Acceptance:** runs against a sample `fleet.yaml`, prints status + "N clients behind latest".

**B5. Agent observability + pre-send guard node (LangGraph).**
- In `agent-service/`, add self-hosted Langfuse tracing of full conversation threads (env-gated by `LANGFUSE_*`; no-op if unset, mirroring how `SentryService` no-ops).
- Add a **pre-send guard node** in the agent graph that, before any outbound message, re-checks consent + channel window + blocklist + a PII scan, and blocks the send if any fail. This is defense-in-depth alongside the backend `MessagePolicyService`.
- **Acceptance:** guard node unit-tested with a blocked and an allowed case; tracing is a no-op when env unset.

**B6. Transactional outbox for outbound sends.**
- Add an `OutboxMessage` Prisma model + migration. On any outbound send, write the intent to the outbox in the **same transaction** as the DB state change, then a worker drains the outbox and calls the channel adapter (WhatsApp/SMS) with retry/backoff via the existing `CircuitBreaker`. Mark delivered/failed; never double-send (idempotency key).
- **Acceptance:** unit test proving (a) a failed external send leaves a retryable outbox row, (b) a crash between DB-write and send does not lose the message, (c) re-drain does not double-send.

---

## 2. WORKING METHOD (follow exactly)

1. Run `git log --oneline -5` and read `CORE_ENGINE_NICHE_PLATFORM_BLUEPRINT.md` fully before any edit.
2. For each task: grep/read the relevant existing files first, state your plan in one sentence, then implement.
3. After each task run the relevant gate:
   - backend: `cd backend && npm run build && npx jest --no-coverage`
   - dashboard: `cd dashboard-v2 && npx tsc --noEmit && npm run build`
4. Commit each task separately with a conventional-commit message (`feat:`/`fix:`/`chore:`), ending the body with a one-line summary of what was verified.
5. Never leave the tree with a failing build or red tests. If a task can't be completed, revert it and report why.

## 3. DEFINITION OF DONE

- All 5 Tier-A holes closed; all 6 Tier-B features implemented.
- `cd backend && npm run build && npx jest` → 16 suites green (new specs added, none removed).
- `cd dashboard-v2 && npx tsc --noEmit && npm run build` → clean.
- `npx ts-node scripts/validate-niche.ts` passes on real configs, fails on broken ones.
- Zero references anywhere to `tenantId`, tenant middleware, tenant context, niche-template DB tables, or platform-admin.
- Every outbound message path passes the consent/blocklist/window guard before sending.
- A new client can go live by: create-from-template → edit `niche.config.yaml` → set `.env` → push → CI validates + deploys.

## 4. OUTPUT FORMAT

For each task, output: the files changed (with full paths), the diffs, the command you ran to verify, and the verification result. End with a final checklist mapping every task (A1–A5, B1–B6) to ✅/❌ and the exact commands a reviewer can run to confirm.
