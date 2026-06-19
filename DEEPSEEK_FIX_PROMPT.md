# DeepSeek Remediation Prompt — Lead Automation Platform

You are a senior engineer fixing a multi-tenant SaaS (NestJS backend + Prisma/Postgres, a Python LangGraph `agent-service`, a Vite/React `dashboard-v2`, and n8n workflows). A deep security/correctness review found ~33 issues. Your job is to fix **all** of them. This document is the full, self-contained spec — you do not need any other context.

## Ground rules (read first)

1. **Work in this priority order:** Section A (Tenancy root cause) → B (Critical) → C (High) → D (Medium) → E (Low). Many bugs share one root cause; A must be done first or other fixes won't hold.
2. **Test-first for every security/correctness fix.** Write a failing test that reproduces the bug, then fix until green. The repo uses Jest (backend: `npm test`) and pytest (agent-service). Add an integration test file `backend/test/tenant-isolation.spec.ts`.
3. **Do not break the existing API shape** consumed by `dashboard-v2/src/lib/data.ts` unless a fix requires it; if it does, update the frontend caller in the same change.
4. **Migrations:** every schema change needs a Prisma migration (`backend/prisma/migrations/...`) plus a data backfill where existing rows would violate new constraints. Never edit an applied migration; add new ones.
5. **After each section, run** `cd backend && npx prisma generate && npm run build && npm test` and `cd agent-service && pytest`. Keep CI green (`.github/workflows/ci.yml`).
6. **Commit per section** with a clear message. Do not bundle unrelated fixes.

---

## SECTION A — TENANCY ROOT CAUSE (do this first; it fixes ~8 findings at once)

The entire tenant model relies on a hand-maintained list in a Prisma middleware that (a) **fails open** when there's no tenant, and (b) **has drifted from the schema** — it lists models that have no `tenantId` column, which makes real-tenant requests throw and leaves sensitive models unscoped.

### A1. Add `tenantId` to the models that are missing it
File: `backend/prisma/schema.prisma`. These models are tenant-owned but have **no `tenantId` column**, yet are listed in the tenant middleware: `Task`, `ConversationMessage`, `MediaFile`, `RevenueRecord`, `AuditLog`.

- Add `tenantId String?` + `tenant Tenant? @relation(fields: [tenantId], references: [id])` + `@@index([tenantId])` to each.
- Add the inverse relation arrays to `Tenant`.
- Create a migration. **Backfill** existing rows from their parent: `Task.tenantId`/`ConversationMessage.tenantId`/`MediaFile.tenantId`/`RevenueRecord.tenantId` ← from the related `Lead.tenantId` (join via `leadId`/`contactId`); `AuditLog.tenantId` ← from the acting user's tenant where resolvable (else leave null and treat null audit logs as platform-level).
- Decide deliberately: `notificationPreference`, `savedFilter`, `importExportLog` are **user-owned, not tenant-owned** — they must NOT be tenant-scoped. Remove them from the middleware list (see A2) and scope them by `userId` instead.

### A2. Make the tenant middleware schema-driven and FAIL-CLOSED
File: `backend/src/prisma/prisma.service.ts`.

Current behavior (broken):
```ts
if (tenantId && model && TENANT_MODELS.has(model)) { ...inject tenantId... }
```
Problems: when `tenantId` is null it injects nothing → cross-tenant access; the hand-list includes models without a `tenantId` column → Prisma throws.

Required:
- Keep an explicit `TENANT_MODELS` set, but it must contain **only** models that actually have a `tenantId` column (after A1: lead, contact, campaign, task, leadForm, conversationMessage, messageTemplate, mediaFile, nurtureSequence, scoringRule, routingRule, integration, crmMapping, bookingSetting, conversion, pipelineStage, automationRule, auditLog, customFieldDefinition, blocklistEntry, slaRule, revenueRecord, businessSettings, qRCode). Remove notificationPreference/savedFilter/importExportLog.
- Introduce an explicit notion of caller context: a tenant-scoped user (has `tenantId`) vs. a platform-superadmin context. Add to the tenant context (`backend/src/shared/tenant-context.service.ts`) a second value, e.g. `isPlatformAdmin: boolean`, set only for users whose role is the platform owner **and** who are intentionally operating cross-tenant.
- **Fail closed:** for a request that is NOT platform-admin and has NO `tenantId`, queries against `TENANT_MODELS` must return nothing / be rejected. Implement by injecting an impossible filter (`where.tenantId = '__no_tenant__'`) for reads and throwing `ForbiddenException` for writes, rather than skipping the filter.
- Cover **all** mutating/reading actions including the ones currently missed: `findMany, findFirst, findUnique, findFirstOrThrow, findUniqueOrThrow, count, aggregate, groupBy, create, createMany, update, updateMany, upsert, delete, deleteMany`. (Today `aggregate`, `groupBy`, `upsert` are not handled — finding #4.)
- For `create`/`createMany`/`upsert`, always set `tenantId` from context (never trust caller-supplied tenantId from a non-admin).

### A3. Fix `tenantFilter` fail-open helper
File: `backend/src/shared/tenant-context.service.ts`. `tenantFilter()` returns `{}` (match-all) when there's no tenant. Change so non-admin + no-tenant returns an impossible filter, not `{}`.

### A4. Close public self-registration / null-tenant accounts
Files: `backend/src/auth/auth.controller.ts`, `backend/src/auth/auth.service.ts`.
- `POST /auth/register` is `@Public()` and creates `role: SALES_AGENT, tenantId: null`, then auto-issues a token. Either (a) remove public registration and make user creation admin-only (preferred), or (b) require a valid invitation token tied to a tenant, and set `tenantId` from that invite. A self-registered user must never end up with `tenantId: null` + a usable session.
- Ensure no normal login path can produce a null-tenant token except the explicit platform-owner account.

### A5. Tenant deletion must not orphan/escalate
Files: `backend/prisma/schema.prisma`, `backend/src/tenants/tenants.service.ts`.
- `User.tenant` (and other tenant relations) default to `onDelete: SetNull`, so deleting a tenant turns its users into null-tenant superusers and orphans data into the global pool (finding #8). Set explicit referential actions: tenant-owned data → `onDelete: Cascade` (or block deletion unless purged); users of a deleted tenant must be deactivated/deleted, not null-tenanted.
- `tenants.service.delete(..., purgeData)` runs `Promise.all` of `deleteMany` across FK-dependent tables → nondeterministic FK violations (finding #9). Replace with a single `prisma.$transaction` that deletes in **dependency order** (children before parents), or rely on `onDelete: Cascade` and delete the tenant once.

### A6. Remove the default seed backdoor
File: `backend/prisma/seed.ts`. It unconditionally creates `owner@example.com` / `admin123` (OWNER, tenantId null) — a production backdoor (finding: default creds).
- Gate seeding behind `if (process.env.NODE_ENV === 'production') throw` unless `ALLOW_PROD_SEED=true`.
- Read the owner email/password from env (`SEED_OWNER_EMAIL`, `SEED_OWNER_PASSWORD`); fail if not provided. Never hardcode a password.

### A7. Webhooks & forms must resolve a tenant
Files: `backend/src/webhooks/webhooks.controller.ts`, `webhooks.service.ts`, `webhook-security.service.ts`, `forms/forms.controller.ts`, `forms/forms.service.ts`.
- Inbound webhooks currently create contacts/leads with no tenant context → `tenantId: null` (finding #3). Add per-tenant webhook keys (map an API key → tenantId) or a tenant identifier in the route/payload, resolve the tenant, and run the handler inside that tenant context (`runInTenantContext`).
- `forms.submit` is `@Public` but the `LeadForm` already has `form.tenantId` — pass it through to `contactsService.findOrCreate` and `leadsService.create` so form leads are correctly tenant-owned.

### A8. Contact dedup must be tenant-scoped + race-safe
Files: `backend/prisma/schema.prisma`, `backend/src/contacts/contacts.service.ts`.
- `findOrCreate` does `findFirst({ where: { phone } })` / `{ email }` with no tenant filter → cross-tenant dedup (finding #2); and `Contact` has no unique constraint so concurrent webhooks create duplicates and the `P2002` recovery branch is dead code (finding #11).
- Add `@@unique([tenantId, phone])` and `@@unique([tenantId, email])` (partial/nullable-aware) to `Contact` + migration that de-duplicates existing rows first.
- Rewrite `findOrCreate` to use `upsert` scoped by tenant, removing the manual find-then-create race.

**Section A acceptance test (`backend/test/tenant-isolation.spec.ts`):**
- Create Tenant A + user A, Tenant B + lead/contact/task/conversation/media/revenue/auditLog B.
- As user A: `GET /leads/:bLeadId` → 404; `GET /leads` → excludes B; `/analytics/*`, `/tasks`, `/conversations`, `/media`, `/revenue`, `/audit-logs`, export → never include B's data.
- A null-tenant non-admin token → reads return empty, writes 403 (not cross-tenant).
- A real-tenant user can create/update a lead **without** a 500 (proves AuditLog/Task/Conversation writes no longer throw).

---

## SECTION B — CRITICAL (after A)

### B1. Unscoped bulk export & purge
File: `backend/src/advanced-features/advanced-features.service.ts`.
- `completeExport` (`contact.findMany/lead.findMany take:10000`) and `purgeSpamAndCold` (`lead.deleteMany`) pass no tenant filter (finding #12). After Section A the middleware will scope these, but **also** pass `tenantId` explicitly and assert it's present (defense in depth). `purgeSpamAndCold` must only ever delete within the caller's tenant.

### B2. Serve (or remove) export/media download routes
Files: `backend/src/main.ts`, `advanced-features.service.ts`, `media.service.ts`.
- Exports write `/exports/<file>.csv` and public media write `/uploads/<key>` but nothing serves these paths → dead links (corrected finding #13). Either add an authenticated, tenant-checked download route (preferred) or route all downloads through the existing signed-URL mechanism. Do not add an unauthenticated `express.static('/uploads')`.

---

## SECTION C — HIGH

### C1. Service-key impersonation scope
File: `backend/src/auth/jwt-auth.guard.ts`. The `x-service-key` bypass authenticates as `SALES_AGENT` with `tenantId` taken from attacker-controllable `body/query` on **every** route (finding #5). Restrict this bypass to the agent endpoints only, and validate the tenantId is one the service is permitted to act on. Keep the key in env; reject if unset.

### C2. Fail-fast secret validation
Files: `backend/src/main.ts` (or a config validation schema), `app.module.ts`. Validate required env at boot: `JWT_SECRET`, `DATABASE_URL`, `REDIS_URL`, and reject known-default secrets (mirror `SignedUrlService.getSecret`). Currently only the signed-URL service validates; JWT does not (finding #6).

### C3. Agent idempotency
Files: `agent-service/app/idempotency.py`, `agent-service/app/runner.py`.
- `mark_done` is a no-op and the key is set **before** the run → failed runs never retry (finding #10).
- The runner does `already_processed` (GET) then `mark_processing` (SET NX) as two steps and ignores the NX result → duplicate concurrent runs.
- Fix: `mark_processing` returns the `SET NX` boolean; the runner aborts immediately if it's false. On success keep the key; **on failure, delete the key** so it can retry. Remove the per-process in-memory fallback or make it explicit that single-worker only.

### C4. `mergeContacts` / `getRevenue` correctness
File: `backend/src/advanced-features/advanced-features.service.ts`. These were 500-ing because of the schema drift (finding #14) — fixed by Section A (Conversation/Media/Revenue now have `tenantId`). Re-verify after A; ensure `mergeContacts` only merges contacts within one tenant and `getRevenue`'s `aggregate` is tenant-scoped.

### C5. Failure-retry is a no-op
Files: `backend/src/failures/failure-retry.processor.ts`, `failures.service.ts`, and `automation-events.processor.ts`.
- The `failure-retry` processor returns `processed:true` without dispatching anything (finding #17). Implement the actual retry dispatch (re-invoke the original operation or enqueue the corresponding automation event), update status to `resolved`/`failed` based on outcome.
- In `automation-events.processor.ts`: `attempts` is never persisted as incremented, so backoff/exhaustion compute against a stale value — persist `attempts: { increment: 1 }` on each retry. Remove the identical-branch ternary `isPermFailure` (both sides equal).

### C6. Phone blocklist normalization mismatch
File: `backend/src/advanced-features/advanced-features.service.ts`. `addToBlocklist` stores phone as `value.toLowerCase().trim()` but `checkBlocklist` strips formatting (`replace(/[\s\-()+]/g,'')`) before lookup → never matches (finding #15). Use one shared `normalizePhone()` for both write and read.

### C7. Encrypt integration credentials at rest
File: `backend/src/integrations/integrations.service.ts` (+ adapters). `redactSecrets` only masks API responses; the `config` JSON (apiKey/secret/token/clientSecret/privateKey) is stored **plaintext** in Postgres (finding #16). Add envelope encryption: encrypt secret fields on `create/update` using a KMS/`INTEGRATIONS_ENC_KEY` (AES-256-GCM), decrypt only inside the adapters at call time. Migrate existing rows.

### C8. Agent prompt-injection hardening
Files: `agent-service/app/graph.py`, `prompt.py`, `tools.py`. Lead-supplied messages are fed to the model with tools that mutate lead state and send messages (finding: prompt injection). 
- Clearly delimit/quote untrusted lead content as data in the prompt (e.g. wrap in a fenced "LEAD MESSAGE (untrusted)" block) and instruct the model to never treat it as instructions.
- Require explicit conditions before business-impacting tools (`push_to_crm`, `record_conversion`) — or gate them behind a human-approval flag.
- Cap `send_message` calls per run and total tool calls (already `max_agent_steps`; add a per-tool counter).
- Treat `extract_fields` values as untrusted (length/whitelist-key validation) since scoring reads them.

---

## SECTION D — MEDIUM

### D1. Adapter SSRF + global-credential bleed + fake health
File: `backend/src/shared/adapters/crm.adapter.ts` (and calendar/messaging).
- Salesforce uses tenant-supplied `instanceUrl` in `fetch()` with creds in the body → SSRF/exfil (finding). Allowlist Salesforce domains (`*.salesforce.com`, `login.salesforce.com`); reject others.
- Every adapter falls back to `process.env.*` platform keys when a tenant hasn't configured its own → tenant A pushes via the platform account (finding). Fail closed: if the tenant's own creds are missing, return an error; do not fall back to global keys (or make global fallback an explicit opt-in only).
- `ZohoAdapter.healthCheck` posts `client_id:'check'` and treats HTTP 400 as healthy → always "ok" (finding). Implement a real check or return `unimplemented`.

### D2. Agent niche-config key mismatch
File: `agent-service/app/graph.py`. `_load_context` requests `/niche-templates/client/current?clientKey={tenant_id}` passing the tenant **UUID**, but `clientKey` is the tenant `key` string elsewhere → lookup always misses → agent always runs the generic fallback prompt (finding). Pass the correct key (resolve tenant.key, or change the endpoint to accept tenantId). Verify the niche config is actually populated end-to-end (also fix the stub in `dashboard-v2/src/context/AppContext.tsx` which hardcodes empty arrays).

### D3. Agent run-summary action statuses always wrong
File: `agent-service/app/graph.py`. `_agent_node` builds `actions_taken` entries without an `id`, but `_persist_node` matches `ToolMessage.tool_call_id == act.get("id")` (always None) → all actions reported unresolved (finding). Capture each tool call's `id` in `_agent_node` so `_persist_node` can resolve real success/error status.

### D4. SLA evaluation uses creation age, not response age
File: `backend/src/advanced-features/advanced-features.service.ts`. `evaluateSlaRules` measures `now - lead.createdAt` as "time without response" and never checks whether an outbound reply exists → false breaches/spurious tasks (finding). Compute against the last OUTBOUND `ConversationMessage` (or `firstResponseAt`); skip leads already responded to. Also: `sla.processor.ts` swallows task-creation errors with `catch {}` — log them.

### D5. Rules engine robustness
File: `backend/src/rules/rules.service.ts`. `evaluateLead` assumes `conditions` is an array (`conditions.every(...)`) → 500 on object/malformed JSON (finding). Guard: coerce to array, validate shape, skip invalid rules. `create`/`findAll` should be tenant-scoped (covered by A but verify).

### D6. Provisioning FK-safety
File: `backend/src/shared/pack-applier.service.ts`. `savedFilter` is created with `userId: userId || ''` → empty string is not a valid FK → `reports`/`saved_filters` packs FK-fail and abort provisioning (finding). Require a valid userId (throw a clear error if absent) instead of `''`.

### D7. Custom-field write race
File: `backend/src/custom-fields/custom-fields.service.ts`. `setValues` does find-then-create per value with no unique constraint → duplicate values under concurrency (finding). Add `@@unique([definitionId, contactId])` / `@@unique([definitionId, leadId])` and use `upsert`.

### D8. Media upload content validation
File: `backend/src/media/media.service.ts`. MIME is taken from the client-supplied header (spoofable) with no magic-byte check; combined with `helmet({ contentSecurityPolicy: false })` in `main.ts`, an HTML-bearing "image" served inline is stored-XSS (finding). Add magic-byte/content sniffing (e.g. `file-type`), serve user files with `Content-Disposition: attachment`, and re-enable a restrictive CSP.

### D9. `@Body() data: any` bypasses DTO validation
Files: controllers that bind `@Body() data: any` (e.g. `tenants.controller.ts`, `rules`, `scoring-rules`, `routing-rules` create paths). DTOs exist and are validated by the global `ValidationPipe`, but `any` bypasses them (finding). Type each `@Body()` with its DTO, and set `forbidNonWhitelisted: true` in `main.ts`'s `ValidationPipe`.

### D10. `business-settings` scoping
File: `backend/src/business-settings/business-settings.service.ts`. `get()/update()` use `findFirst()` (first row) with no scoping → wrong/cross-tenant settings for null-tenant callers (finding). Scope by tenant explicitly; create the per-tenant row on first access.

### D11. Webhook replay (Stripe timestamp)
File: `backend/src/shared/webhook-security.service.ts`. `verifyStripeSignature` validates the HMAC but never checks the `t` timestamp tolerance → replay (finding). Reject events whose timestamp is older than ±5 minutes.

### D12. Operational/PII tables isolation
Files: `events.service.ts`, `failures.service.ts`, `timeline.service.ts` (+ schema). `SystemEvent`, `FailureRecord`, `TimelineItem` carry lead PII/payloads but have no tenant column and are queried without tenant filters (finding #18). Add `tenantId` (backfill from `leadId`) and scope their reads, or scope strictly via the lead relation.

---

## SECTION E — LOW / cleanup

- **E1.** Delete dead code: the legacy Next.js `dashboard/` tree (commit said removed but 41 files remain) and the duplicate UI tree inside `dashboard-v2/src/components/*` + duplicate `src/data.ts`/`src/types.ts` (canonical is `src/pages/*` and `src/lib/*`). Confirm which is wired in `App.tsx`, delete the other.
- **E2.** `backend/src/shared/scoring.util.ts` `evaluateCondition` `equals`: `String(value || '')` turns numeric/boolean `0`/`false` into `''` so rules on zero never match. Use `String(value ?? '')`.
- **E3.** `failure-inbox` token check uses `token !== expectedToken` (non-constant-time) in `advanced-features.controller.ts` — use `crypto.timingSafeEqual` like the rest of the codebase.
- **E4.** `health/deep` returns raw dependency `e.message` (`health.service.ts`) — return generic statuses externally.
- **E5.** `dashboard-v2/src/lib/useAuth.ts` has a leftover Next.js `'use client'` directive — remove. Consider moving the JWT out of `localStorage` (XSS exposure) to an httpOnly cookie, and add token refresh/revocation so disabling a user takes effect before 24h.
- **E6.** `integrations.service.ts` `SECRET_FIELDS` includes the generic key name `key` → over-redacts legitimate config. Narrow it.
- **E7.** `campaigns.duplicate` drops `tenantId`, `formId`, `qrCodeId`, `nurtureId`, `assignedAgentId` from the copy — carry them over (tenantId comes from context).
- **E8.** `agent-service/app/backend_client.py` `_retry_get` return type hint `-> callable` is wrong (returns a coroutine) — fix the hint.

---

## Definition of done
- All sections A–E implemented with migrations + backfills.
- `backend/test/tenant-isolation.spec.ts` passes and proves cross-tenant reads/writes/exports are blocked and real-tenant mutations don't 500.
- `cd backend && npm run build && npm test` green; `cd agent-service && pytest` green; CI green.
- No default credentials, no plaintext secrets at rest, no fail-open tenant paths remain.
- Frontend still builds (`cd dashboard-v2 && npm run build`) and any changed API contracts are reflected in `dashboard-v2/src/lib/data.ts`.

Produce the changes as a series of commits, one per section, each with the failing-test-then-fix evidence in the commit body.
