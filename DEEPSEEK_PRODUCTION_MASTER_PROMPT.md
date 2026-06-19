# DeepSeek Master Build Prompt — Ship This to 10/10 Production

You are the lead engineer taking a lead-capture → nurture → book → convert platform from ~55% to **production-ready, sellable, 10/10**. The platform is: **NestJS backend (Prisma/Postgres, BullMQ/Redis)**, a **Python LangGraph `agent-service`**, a **Vite/React `dashboard-v2`**, and **n8n** (being retired). You will execute this in **tracks, in dependency order**. This doc is the master plan; two tracks delegate to existing self-contained prompts in this repo.

## How to use this document

This orchestrates four prompts. Read each before starting its track:
- **Track C → `DEEPSEEK_AUTOMATION_BUILD_PROMPT.md`** (the autonomous automation engine — already specced in full).
- **Track B → `DEEPSEEK_FIX_PROMPT.md`** (security/tenancy/correctness — already specced).
- **Track A → `CORE_ENGINE_NICHE_PLATFORM_BLUEPRINT.md`** (the single-tenant + config-file architecture).
- Tracks D, E, F, G, H, I, J are specced in full **below**.

### Dependency order (do not reorder)
```
A (architecture pivot)  ──►  B (security, now smaller)
        │                         │
        ├──► C (automation engine)│
        ├──► D (niche content)    │
        ├──► G (channels)         │
        └──► E (UI redesign) ◄─────┘   (E can start in parallel after A)
                  │
        F (billing) ──► H (testing) ──► I (prod readiness) ──► J (compliance gate)
```
**A first** — it deletes whole classes of later work (multi-tenant security bugs vanish by construction). Then B/C/D/E/G can parallelize. F→H→I→J are the finish line.

## Global ground rules
1. **Test-first** for every behavioral change. Backend Jest, agent pytest, frontend Vitest + Playwright E2E. A change without a test does not count as done.
2. **Every schema change = a new Prisma migration + backfill.** Never edit an applied migration.
3. **Conventional commits, one logical change per commit, commit per sub-section.** After each track: `cd backend && npx prisma generate && npm run build && npm test`, `cd agent-service && pytest`, `cd dashboard-v2 && npm run build && npm test && npm run test:e2e`. Keep CI green.
4. **No secrets in code or git.** Everything via env; provide `.env.example`. Fail fast on missing required env at boot.
5. **No `any` in new TypeScript.** Strict types. No `// @ts-ignore`.
6. **Accessibility is not optional** in the UI track (WCAG AA, keyboard nav, focus states, aria labels).
7. When a track delegates to another prompt file, **follow that file exactly**; do not duplicate or contradict it here.

---

## TRACK A — Single-tenant + config-file architecture (do first)

Execute `CORE_ENGINE_NICHE_PLATFORM_BLUEPRINT.md` end to end. Summary of deliverables (the blueprint has the detail):
- **`config.schema.json`** + `niche.config.yaml` contract (reuse the existing `packs[]` shape from `agent-service/app/niche_config.py` and `backend/src/niche-templates/templates/*.ts`).
- **`backend/src/bootstrap/config-loader.service.ts`** — validate `niche.config.yaml` at boot (fail fast), reconcile idempotently via the existing `PackApplierService` (upsert by stable key; re-run converges, never duplicates).
- **Strip tenancy:** remove the Prisma tenant middleware, `tenant-context.*`, `tenant.interceptor.ts`; migration to drop `tenantId` columns/indexes/relations; remove `Tenant`, `NicheTemplate`, `NicheTemplatePack`, `ClientTemplateInstallation` models and the `niche-templates`/`tenants` modules. **Keep `PackApplierService`** (now boot-time, file-driven).
- **Agent** reads niche config from the local file/endpoint, not `/niche-templates/client/current`.
- **Base images** published from a `core-engine` repo CI (`core-backend`, `core-agent`, `core-dashboard` with semver tags); **`niche-template-starter`** GitHub template repo; per-client `docker-compose.yml` builds `FROM` pinned tags + mounts `niche.config.yaml`.
- **Track-A DoD:** a fresh deploy with only a `niche.config.yaml` + `.env` boots, self-seeds, and runs the full lifecycle. No `tenantId` anywhere. Cross-tenant security bugs are structurally impossible.

---

## TRACK B — Security & correctness hardening

Execute `DEEPSEEK_FIX_PROMPT.md`. **After Track A, skip the tenant-isolation sections that no longer apply** (single deploy = one org). What still must be done regardless of tenancy:
- **Auth:** registration is admin/invite-only; no public null-role accounts; bcrypt(12); JWT rotation + short-lived access + refresh; **login rate-limit/lockout** (per-IP + per-account, via `@nestjs/throttler` already present).
- **Webhooks:** HMAC signature verification per provider (per-deploy secret); reject on failure; replay protection (timestamp window + nonce). Derive identity from the credential, never from a request header/body.
- **Input validation:** every DTO uses `class-validator`; global `ValidationPipe({ whitelist:true, forbidNonWhitelisted:true })`.
- **Secrets at rest:** integration credentials encrypted (the repo already has re-encryption migrations — verify the key comes from env and rotation is documented).
- **Security headers:** `helmet`, CORS allowlist from env, rate limits on public routes, request body size caps, file-upload type/size validation on `/media`.
- **Track-B DoD:** `npm audit --audit-level=high` clean; a security test suite covers authz on every controller; OWASP top-10 review notes committed in `docs/security-review.md`.

---

## TRACK C — Autonomous automation engine

Execute `DEEPSEEK_AUTOMATION_BUILD_PROMPT.md` (Phases 0–5): policy send-gate + consent + per-lead locking (P0), durable `ScheduledAction`/BullMQ scheduler + self-rescheduling nurture (P1), trigger types + supersession + pre-flight model-tiering (P2), bounded rolling-summary memory (P3), Langfuse tracing + online-eval guardrail + shadow→approval→full autonomy ramp (P4), retire n8n (P5).
- **Track-C DoD:** full lifecycle (capture → multi-day drip → mid-journey reply that cancels the pending drip → book → convert → re-engage) runs with **no n8n**, every send passing the policy gate, every run traced.

---

## TRACK D — Niche template authoring (12 industries)

Author production `niche.config.yaml` files (new architecture format) for the target industries from `NICHE_TEMPLATE_SYSTEM_BUILD_GUIDE.md`:
1. Event marketing agency (port existing) 2. Real estate (port existing) 3. Education/coaching 4. Healthcare clinics 5. B2B service agencies 6. Financial/insurance advisors 7. Legal firms 8. Travel/tour operators 9. Home improvement/interior 10. Automotive dealerships 11. Franchise sales 12. SaaS demo booking.

Each config must define: `custom_fields, lead_forms, pipeline_stages, scoring_rules, routing_rules, message_templates` (with WhatsApp categories), `nurture_sequences` (with delays + intents), `booking_settings, crm_mappings, conversion_goals, labels, branding, agent.prompts/tone/goals, compliance`.
- **Build a validation harness:** `scripts/validate-niche.ts` runs each config through `config.schema.json` + a dry-run reconcile against an ephemeral DB; CI fails if any niche is invalid. A broken niche must never deploy.
- **Track-D DoD:** all 12 validate and dry-run clean; each produces a coherent agent persona and a sane multi-step nurture journey.

---

## TRACK E — UI/UX redesign (login + dashboard) — make it genuinely beautiful

The current `dashboard-v2` pages are functional shells (25–70 lines, default Tailwind grays, no design system). Rebuild the UI to a **distinctive, production-grade SaaS standard** — not generic AI output. Use the available **shadcn/ui**, **tailwindcss**, **react-hook-form**, **tanstack-query** skills/patterns.

### E1. Design system (build this first — everything else consumes it)
- **Component library:** adopt **shadcn/ui** (Radix primitives + Tailwind) as the base. Install Button, Input, Select, Dialog, Sheet, DropdownMenu, Table, Tabs, Card, Badge, Tooltip, Toast (sonner), Skeleton, Avatar, Command (you already have a CommandPalette — rebuild on shadcn `Command`).
- **Design tokens** in `tailwind.config` + CSS variables: an intentional palette (a real brand hue + neutral ramp, **driven by `niche.config.branding`** so each deploy is brand-themed), a type scale (e.g. Inter/Geist, 12→32px), an 4px spacing scale, radius scale, and a layered shadow system. **Full dark mode** via CSS variables.
- **Motion:** subtle, purposeful (Framer Motion or CSS) — page transitions, list item enter, dialog spring. No gratuitous animation.

### E2. App shell
- Persistent **collapsible left sidebar** (grouped nav: Overview, Leads, Conversations, Campaigns, Automations, Analytics, Settings), with the niche branding/logo at top and user menu at bottom.
- **Top bar:** breadcrumbs, global command palette (`⌘K`), notifications, theme toggle, account menu.
- **Consistent page scaffold:** reusable `PageHeader` (title, description, primary action, filters row), content container, and standardized **empty / loading (skeleton) / error** states for every page.
- Fully **responsive** (sidebar → sheet on mobile).

### E3. Login & auth screens (they specifically look bad — fix them)
- **Split-screen login:** left = form (brand mark, email/password with inline validation via react-hook-form + zod, show/hide password, loading state, friendly error toasts); right = branded panel (gradient/mesh + product value props or a tasteful illustration). Centered-card fallback on mobile.
- Add **forgot-password**, and polished **403/404/500** and **maintenance** screens.

### E4. Rebuild the data-heavy pages to real quality
- **Leads:** a proper data grid (TanStack Table) — sortable/filterable/paginated, saved views, row selection + bulk actions, a slide-over **Lead detail** (timeline, conversation thread, collected fields, score history, scheduled actions, notes), inline status/segment editing.
- **Conversations/Inbox:** a real **team inbox** — conversation list + thread view + composer, AI-vs-human indicator, human-takeover button, and an **approval queue** surface for the automation autonomy ramp (Track C P4).
- **Automations:** visualize each lead's journey/scheduled actions and the nurture sequences (read from config); show the agent's next planned touch.
- **Analytics:** dashboards with **recharts** — funnel (capture→qualified→booked→converted), source breakdown, response/booking rates, agent cost & message volume. Consistent chart styling + tokens.
- **Settings:** profile, team, branding preview, business hours/quiet hours, integrations (connection status), autonomy level, consent/compliance.
- Toasts via **sonner**; forms via **react-hook-form + zod**; server state via **tanstack-query** (loading/error/optimistic updates) — remove ad-hoc fetches.

### E5. Polish & a11y
- Keyboard navigable everywhere; visible focus rings; aria labels; reduced-motion support; color-contrast AA; favicon/og tags/title per niche branding.
- **Track-E DoD:** a design-token file is the single source of truth; every page uses the shell + standardized states; login and dashboard look like a funded SaaS product; Lighthouse a11y ≥ 95; zero default-gray-on-white "shell" pages remain.

---

## TRACK F — Billing & usage metering

- **Provider:** **Razorpay** primary (India) + **Stripe** for international — behind a `PaymentProvider` interface so a deploy picks one via config.
- **Plans & limits** in config/DB: seats, monthly lead cap, message cap, agent-run/token budget. Enforce quotas at the action boundary (block/soft-warn).
- **Metering:** record per-deploy usage (leads, outbound messages by WhatsApp category, agent tokens & model). Surface in a **Billing** settings page; export invoices.
- **Webhooks:** subscription lifecycle (created/renewed/failed/cancelled) → toggle features/quotas; dunning emails on failed payment.
- **Track-F DoD:** a deploy can subscribe, hit a quota and be limited, and see accurate usage; billing webhooks verified + idempotent.

---

## TRACK G — Channel adapters & messaging hardening

- **Resilience:** wrap every adapter (`messaging`, `email`, `crm`, `calendar`) with retry + exponential backoff + **circuit breaker** + timeout; failures go to a dead-letter/`FailureRecord` with replay (the failures module exists — wire adapters into it).
- **Outbox pattern** between DB write and external send so a crash can't drop or double-send (idempotency keys per outbound).
- **WhatsApp lifecycle:** model template **approval status + category + language + quality rating + 24h window**; sync approval state from Meta; block sends that would fail; surface state in Settings. (Complements Track C policy gate.)
- **New channels:** **SMS (Twilio)** and **Instagram DM** adapters behind the same interface; **email deliverability** (templates, attachments, SPF/DKIM guidance, bounce/complaint handling).
- **Track-G DoD:** a provider 5xx is retried then dead-lettered (not lost); no double-sends under retry; adding a channel is config, not core surgery.

---

## TRACK H — Testing & quality gates

- **Backend:** unit + integration (Testcontainers/CI Postgres+Redis) for every service; authz tests per controller; ≥80% coverage on services.
- **Agent:** pytest unit + a **deterministic eval harness** — golden transcripts per niche, LLM-as-judge scoring, recorded-conversation replay; CI runs the eval and fails on regression.
- **Frontend:** Vitest + React Testing Library for components/hooks; **Playwright E2E** for the critical flows (login, lead intake, conversation+takeover, booking, settings).
- **Load:** k6 smoke on webhook intake + agent run path.
- **Track-H DoD:** CI runs all suites; coverage gates enforced; E2E green headless in CI.

---

## TRACK I — Production readiness / DevOps / observability

- **Containers:** multi-stage, non-root, pinned digests, healthchecks; `docker-compose.prod.yml` + sample k8s/Render/Fly manifests.
- **Observability:** **Sentry** (backend + agent + frontend), structured JSON logs with request/trace IDs propagated backend↔agent, `/health` + `/health/deep` aggregated, uptime + alerting hooks.
- **Data:** automated Postgres backups + documented restore; migration deploy gate; seed gated out of prod (already done — verify).
- **CI/CD:** build/test/scan → publish base images on tag (Track A) → deploy; **fleet registry** (`fleet.yaml` / control-plane table) tracking each client's `core_engine_version`; rolling-upgrade runbook.
- **Track-I DoD:** a one-command deploy brings up a healthy, observable stack; a core version bump rolls a client cleanly with rollback documented.

---

## TRACK J — Compliance & legal (final gate)

- **DPDP (India):** explicit opt-in capture + storage (Track C P0), easy withdrawal, **data export + erasure** endpoints (7-day SLA), 72h breach-notification runbook, data-processing records, privacy policy + cookie/consent notice in the UI, AI-disclosure on agent messages.
- **Financial/trading niches:** auto-inject "not financial advice / educational" disclaimers per `compliance` config (per repo CLAUDE.md policy).
- **Track-J DoD:** a user can export and delete their data; consent is provable; disclaimers render where required.

---

## Definition of Done — the 10/10 production gate (all must be true)
- [ ] Fresh client = scaffold from `niche-template-starter` + fill `niche.config.yaml` + set `.env` → live in < 1 day, isolated, on its own host (Track A).
- [ ] No `tenantId`/multi-tenant code paths; `npm audit` high-clean; authz tested on every route (A/B).
- [ ] Full lifecycle runs with **no n8n**; every outbound send passes the policy gate (consent/quiet-hours/rate/dedup/window); journeys self-reschedule and supersede on reply; all 12 niches validate (C/D).
- [ ] Login + dashboard look like a funded SaaS: design-token system, shadcn/ui, dark mode, branded per niche, Lighthouse a11y ≥ 95, no shell pages (E).
- [ ] Billing works end-to-end with quota enforcement + accurate metering (F).
- [ ] Adapters retry→circuit-break→dead-letter with no double-sends; SMS/IG/email + WhatsApp template lifecycle in place (G).
- [ ] Backend/agent/frontend test suites + agent eval + Playwright E2E all green in CI with coverage gates (H).
- [ ] Sentry + structured tracing live; one-command deploy; backups + rollback runbook; fleet registry (I).
- [ ] Data export/erasure + consent proof + AI disclosure shipped (J).

## Decisions baked in (change here if you disagree, then proceed)
- Billing: **Razorpay primary + Stripe international**, behind one interface.
- UI base: **shadcn/ui + Tailwind + TanStack Query/Table + react-hook-form/zod + recharts + sonner**.
- Observability: **Sentry + Langfuse (self-hosted)**.
- Scheduling: **backend BullMQ durable timers**, brain stays in the Python LangGraph agent.
- Architecture: **single-tenant per deploy**, core engine as **pinned base image**, niche as **config overlay** (no engine forking).
