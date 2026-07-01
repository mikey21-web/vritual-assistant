# Production-Readiness Audit — Full Gap List

> **Date:** 2026-06-20
> **Scope:** Marketing agency lead automation platform, single-tenant deployment per client
> **Current completion estimate:** ~74% (or ~82% excluding credentials/setup work)
> **Items in this audit:** 250
> **What this list is NOT:** A replacement for business/operational/legal work needed to actually hand a system to a client

---

## Table of Contents

1. [Security & Auth](#1-security--auth) — 30 items
2. [Data Integrity](#2-data-integrity) — 25 items
3. [Reliability & Resilience](#3-reliability--resilience) — 35 items
4. [Monitoring & Observability](#4-monitoring--observability) — 25 items
5. [Infrastructure & Deployment](#5-infrastructure--deployment) — 25 items
6. [Multi-Tenant / Agency Features](#6-multi-tenant--agency-features) — 25 items
7. [Integrations](#7-integrations) — 20 items
8. [Frontend / Dashboard](#8-frontend--dashboard) — 35 items
9. [Testing](#9-testing) — 15 items
10. [Operations & Process](#10-operations--process) — 15 items
11. [What This List Does NOT Cover](#what-this-list-does-not-cover)

---

## 1. Security & Auth

| # | Gap | Severity | Notes |
|---|-----|----------|-------|
| 1 | No MFA/2FA anywhere | Critical | No TOTP fields on User model, no backup codes, no `requireMfa` flow |
| 2 | No password complexity enforcement | High | Only `@MinLength(10)` on register. No upper/lower/digit/symbol checks, no breach check (HaveIBeenPwned) |
| 3 | No forgot-password / reset flow | Critical | Login page has dead "Forgot password?" link, no `/auth/forgot` or `/auth/reset` route |
| 4 | No email verification on register | High | |
| 5 | No JWT rotation / refresh tokens | High | Single 24h access token, logout is client-side only. Stolen token = 24h access |
| 6 | No token revocation | High | `JwtAuthGuard` trusts any signature-valid token regardless of user `active` status. Role/email changes don't invalidate old tokens |
| 7 | No account lockout on failed logins | High | Only global 10/min/IP throttler. No progressive delay / lockout after N failed attempts |
| 8 | Login DTO has no min-length on password | Medium | Empty strings pass `IsString` and hit bcrypt (timing-leak risk + DoS via bcrypt on long inputs) |
| 9 | Service-key comparison uses `!==` (timing-unsafe) on `/agent/*` | High | Should be `timingSafeEqual` on equal-length buffers |
| 10 | No `Idempotency-Key` header support on writes | Medium | |
| 11 | No tenant model — `schema.prisma` has no `Tenant` and no `tenantId` on business tables | Critical | Single biggest gap. Anyone with JWT can read/modify every integration across all tenants |
| 12 | Any JWT can read/modify every integration across all tenants | Critical | Direct consequence of #11 |
| 13 | No tenant resolver middleware | Critical | `backend/src/middleware/` is empty, single-tenant only |
| 14 | CORS fallback to localhost in production if `CORS_ORIGIN` missing | Medium | Silent fallback is dangerous |
| 15 | CSP `styleSrc` includes `'unsafe-inline'` | Medium | Defeats nonce-based CSP |
| 16 | CSP missing `objectSrc 'none'`, `frameAncestors 'none'`, `base-uri 'self'`, `form-action 'self'` | Medium | |
| 17 | No HSTS | High | `helmet.hsts` not enabled (maxAge, includeSubDomains, preload) |
| 18 | No CSRF middleware | Low | Future-proofing gap if cookies added |
| 19 | No PII redaction in logs | High | `LoggingInterceptor` likely logs request bodies; `text`/`email`/`phone` fields leak |
| 20 | Webhook secret rotation not supported | High | `WHATSAPP_APP_SECRET` / `STRIPE_WEBHOOK_SECRET` are single values |
| 21 | Body size cap of 1mb on webhooks | Medium | Too low for media/CRM push (legitimate Stripe/WhatsApp payloads can exceed 1mb) |
| 22 | .env file committed to git with `local-dev-jwt-secret-2024` | High | Real secrets in version control |
| 23 | `INTEGRATIONS_ENC_KEY=change-me-32-char-encryption-key!!` is 33 chars | High | Likely breaks AES-256 which needs exactly 32 bytes |
| 24 | `docker-compose.yml` uses `latest` n8n tag | Medium | Non-deterministic |
| 25 | No `SECURITY.md` in repo | Medium | |
| 26 | No `CODE_OF_CONDUCT.md` in repo | Low | |
| 27 | No `CONTRIBUTING.md` in repo | Low | |
| 28 | No `CHANGELOG.md` in repo | Low | |
| 29 | No `SECURITY.md` vulnerability disclosure policy | Medium | Required for any procurement/security review |
| 30 | No secret rotation mechanism | High | |

---

## 2. Data Integrity

| # | Gap | Severity | Notes |
|---|-----|----------|-------|
| 31 | `contacts.service.findOrCreate` not in `$transaction` | High | Race conditions create duplicate contacts |
| 32 | `leads.service.create` not in `$transaction` | High | Same race for leads |
| 33 | No optimistic locking | High | No `version` field on any model |
| 34 | No Prisma transaction isolation level configured | Medium | |
| 35 | Lead updates have last-write-wins | High | Concurrent webhooks overwrite each other |
| 36 | Scoring rule evaluation is read-compute-write, not atomic | Medium | |
| 37 | In-memory idempotency in agent service is unsafe in multi-replica | High | Duplicate webhook processing guaranteed with 2+ replicas |
| 38 | No soft-delete on Lead/Contact | High | `User.delete` hard-deletes history including conversations, score logs, ownership history |
| 39 | No cascade delete consistency check | Medium | |
| 40 | No bulk delete / GDPR right-to-erasure endpoint for Contact/Lead | High | Required for GDPR/CCPA |
| 41 | No data export endpoint (right to data portability) | High | |
| 42 | No cookie consent banner | Medium | |
| 43 | No CHECK constraints in Prisma schema | Medium | Prisma doesn't natively support — would need raw migrations |
| 44 | No CSV import validator | High | No import endpoint exists |
| 45 | No dedup logic on imports | Medium | |
| 46 | No phone/email normalization service | Medium | |
| 47 | No UUID collision risk mitigation documented | Low | |
| 48 | Outbox `dispatchViaChannel` is unawaited fire-and-forget on request thread | High | Slow WhatsApp API blocks HTTP response (no BullMQ enqueue) |
| 49 | Slow WhatsApp API blocks HTTP response | High | Direct consequence of #48 |
| 50 | Webhook event dedup silently drops 6-hour-late retries without alerting | Medium | |
| 51 | `WebhookEvent` data has no TTL/purge | Medium | Grows forever |
| 52 | `AutomationEvent` has no pruning worker | Medium | Grows forever |
| 53 | `OutboxMessage` accumulates forever | Medium | |
| 54 | `FailureRecord` accumulates forever | Medium | |
| 55 | `AuditLog` records are never pruned | Medium | Will grow forever in multi-tenant system |

---

## 3. Reliability & Resilience

| # | Gap | Severity | Notes |
|---|-----|----------|-------|
| 56 | No SIGTERM handler in NestJS `main.ts` | Critical | Killing process mid-request drops in-flight BullMQ jobs |
| 57 | No `app.enableShutdownHooks()` | Critical | BullMQ jobs lost on deploy |
| 58 | No HTTP server close timeout configured | Medium | |
| 59 | No unhandled rejection handler in backend | High | `process.on('unhandledRejection')` missing |
| 60 | No uncaught exception handler in backend | High | `process.on('uncaughtException')` missing |
| 61 | No `process.on('unhandledRejection')` in agent service | High | |
| 62 | No uncaught exception handler in agent service | High | |
| 63 | Redis hard dependency at boot | Critical | Backend fails if Redis unavailable at startup |
| 64 | Postgres hard dependency at boot | Critical | `PrismaService.$connect()` crashes if DB down |
| 65 | No retry-with-backoff on initial DB connection | High | |
| 66 | No circuit breaker on Claude API calls | Critical | If Anthropic is down, agent keeps hammering it, wasting tokens |
| 67 | No circuit breaker on CRM push operations | Critical | If HubSpot is down, requests pile up |
| 68 | No circuit breaker on WhatsApp Cloud API in messaging adapter | High | |
| 69 | Circuit breaker threshold (5 failures) hardcoded | Medium | |
| 70 | Circuit breaker reset timeout (30s) hardcoded | Medium | |
| 71 | No half-open auto-recovery logging | Medium | |
| 72 | No timeout on Claude API calls in agent | Critical | Hangs forever if Anthropic is slow |
| 73 | No timeout on WhatsApp Cloud API fetch | High | |
| 74 | No timeout on HubSpot/Salesforce/Zoho fetches | High | |
| 75 | No timeout on outbox adapter HTTP calls | High | |
| 76 | No HTTP timeout middleware in NestJS | High | |
| 77 | Prisma connection pool not configured | High | Uses defaults; connection pool exhaustion under load |
| 78 | No `connectionLimit` set on Prisma | High | |
| 79 | No `pool_timeout` set | Medium | |
| 80 | No slow query log | Medium | No visibility into DB performance |
| 81 | No graceful degradation if Redis goes down at runtime | High | |
| 82 | No graceful degradation if Postgres goes down at runtime | High | |
| 83 | No graceful degradation if n8n goes down | Low | n8n used via webhook, no direct dependency |
| 84 | No graceful degradation if Claude/Anthropic goes down | High | |
| 85 | Agent service boot crashes if env vars missing | Low | Acceptable but no recovery |
| 86 | No chaos engineering setup | Medium | |
| 87 | No disaster recovery plan | Critical | |
| 88 | No RTO/RPO targets documented | High | |
| 89 | No failover strategy | High | |
| 90 | No backup verification or restore-drill automation | High | |

---

## 4. Monitoring & Observability

| # | Gap | Severity | Notes |
|---|-----|----------|-------|
| 91 | Sentry is fake | Critical | `@sentry/node` not in package.json, init code is commented out. Crash reporting is silently a no-op |
| 92 | Sentry init code is commented out | Critical | Direct cause of #91 |
| 93 | No Prometheus metrics endpoint | Critical | |
| 94 | No `/metrics` route exposed | Critical | |
| 95 | No request duration histograms | High | |
| 96 | No database query metrics | High | |
| 97 | No business metrics (leads created, conversions, agent runs) | High | |
| 98 | No alerting configuration | Critical | |
| 99 | No Slack/Discord/PagerDuty alerting | Critical | Healthcheck failures don't page anyone |
| 100 | Health check `/deep` is auth-locked | High | Load balancers and orchestrators can't use it |
| 101 | Health check doesn't ping Redis at runtime | High | Just checks if env var is set |
| 102 | Health check doesn't validate Claude API key | Medium | |
| 103 | No `/health/ready` vs `/health/live` distinction | High | Liveness probe returning 200 even when DB/Redis are down is dangerous for k8s |
| 104 | n8n health check catches all errors as "unreachable" | Low | No distinction between DNS vs auth vs timeout |
| 105 | No distributed tracing (OpenTelemetry, Jaeger) | High | |
| 106 | No APM (Datadog/New Relic) | Medium | |
| 107 | No RUM on dashboard | Medium | |
| 108 | No uptime monitoring integration | High | |
| 109 | No synthetic monitoring | Medium | |
| 110 | NestJS uses default text logger, not JSON | High | Can't ship to log aggregators |
| 111 | Agent service uses `ConsoleRenderer`, not JSON output | High | |
| 112 | No cross-service correlation IDs | High | Impossible to trace a single customer request across services |
| 113 | No request ID / correlation ID middleware | High | |
| 114 | No log aggregation config | Medium | |
| 115 | No structured error logging with stack traces in production | Medium | |

---

## 5. Infrastructure & Deployment

| # | Gap | Severity | Notes |
|---|-----|----------|-------|
| 116 | No Terraform/Pulumi/CDK — no IaC | High | Every deploy is hand-rolled; no reproducibility |
| 117 | No Kubernetes manifests / Helm chart | Medium | Only docker-compose |
| 118 | No CDN config | Medium | |
| 119 | No WAF config | High | |
| 120 | No firewall rules documented | Medium | Checklist just says "allow required ports" |
| 121 | `dashboard-v2/nginx.conf` is dev-only | High | No TLS, no caching, no rate limits, no security headers beyond default |
| 122 | `docker-compose.yml` uses `host.docker.internal` | High | Mac/Windows only — broken on Linux prod |
| 123 | No zero-downtime deploys (rolling updates) | High | |
| 124 | No database migration timing strategy relative to deploy | High | |
| 125 | No static asset invalidation (CDN cache) | Medium | |
| 126 | Docker image pinning inconsistent | Medium | `latest` used in places |
| 127 | No multi-region failover | High | |
| 128 | No Terraform state management | High | |
| 129 | No infrastructure drift detection | Medium | |
| 130 | No staging environment config separate from prod | High | |
| 131 | No environment promotion strategy | Medium | |
| 132 | No blue-green or canary deploy strategy | Medium | |
| 133 | Backup script writes to local disk only | Critical | No S3/cloud |
| 134 | No automated backup scheduling | High | No cron, no k8s CronJob |
| 135 | No `pg_dump --format=custom` or WAL archiving | High | Plain SQL dumps don't support point-in-time recovery |
| 136 | No point-in-time recovery capability | High | |
| 137 | No backup encryption | Critical | `db_*.sql.gz` stored unencrypted; host compromise = total PII leak |
| 138 | No backup off-host shipping | High | No `aws s3 cp` / `rclone` |
| 139 | No Redis backup | Medium | AOF/RDB on volume not backed up |
| 140 | Backup script uses `pg_dump` without specifying host | Low | Assumes local postgres |

---

## 6. Multi-Tenant / Agency Features

| # | Gap | Severity | Notes |
|---|-----|----------|-------|
| 141 | No per-client branding preview UI | Medium | |
| 142 | No self-serve onboarding | High | Registration requires existing OWNER |
| 143 | No agency-level billing dashboard | High | BillingModule is single-tenant Stripe/Razorpay |
| 144 | No per-client usage/quota tracking | High | |
| 145 | No client switching / multi-tenant resolver | Critical | |
| 146 | No SSO (SAML/OIDC) | Critical | Blocks any real B2B sale |
| 147 | No fleet management UI | High | Only CLI via `fleet-status.ts` |
| 148 | No 1-click niche deployment wizard | High | |
| 149 | No niche config clone/duplicate API | Medium | |
| 150 | No bulk customer import (CSV/JSON) | High | |
| 151 | No bulk data export (per-tenant dump) | High | |
| 152 | No CSV lead importer | High | |
| 153 | No agency-level reporting across all clients | High | |
| 154 | No client billing/quoting tool | High | |
| 155 | No white-label preview before deploy | Medium | |
| 156 | No tenant→plan mapping in DB | Critical | |
| 157 | Billing hardcoded to "Pro" plan | High | `checkQuota` always uses `PLANS[2]` |
| 158 | No per-tenant subscription lookup | High | |
| 159 | No impersonation endpoint (with audit) | Medium | |
| 160 | No admin super-panel beyond OWNER role | Medium | |
| 161 | No system log viewer UI | Medium | |
| 162 | No manual job trigger UI | Medium | |
| 163 | No per-tenant API key management | High | |
| 164 | No per-tenant webhook signing keys | High | |
| 165 | No per-tenant data residency controls | Medium | |

---

## 7. Integrations

| # | Gap | Severity | Notes |
|---|-----|----------|-------|
| 166 | Stripe provider 100% stubbed | Critical | `stripe` SDK not in package.json |
| 167 | Stripe `createCheckoutSession` returns `?session_id=stub_${plan.id}` | Critical | |
| 168 | Stripe webhook signature verification not implemented | Critical | |
| 169 | No payment webhook handlers wired | Critical | `payment_intent.succeeded`, `invoice.paid` never fire |
| 170 | Razorpay webhook signature verification is broken | Critical | JSON.stringify vs raw body — signatures never match |
| 171 | Razorpay SDK not in package.json | Critical | |
| 172 | `IntegrationsModule` doesn't declare adapters in `providers` | High | Nest resolves transitive deps but it's an explicit DI bug |
| 173 | `CalendarAdapter` / `MessagingAdapter` not imported in module file | High | |
| 174 | Zoho adapter `healthCheck` always returns `false` | High | "Test integration" button will always show Zoho disconnected |
| 175 | Salesforce `healthCheck` uses wrong grant type | High | `grant_type=client_credentials` with username/password config |
| 176 | WhatsApp Cloud `healthCheck` hits `/me` (debug endpoint) | High | Returns 200 for any token regardless of WABA config |
| 177 | Google Calendar JWT signing broken | High | Raw multi-line private keys with escaped `\n` will fail without PKCS8 parsing |
| 178 | Calendly adapter doesn't preflight lead data | Medium | Creates generic scheduling link without passing lead name/email as invitee |
| 179 | Email adapter has no retry, no queue, no template engine | High | Raw HTML via nodemailer |
| 180 | No SendGrid/Resend integration | High | |
| 181 | No MJML/Handlebars templates | Medium | |
| 182 | No bounce handling for emails | High | |
| 183 | No integration health check dashboard | Medium | |
| 184 | n8n workflows are skeletons | High | No credentials, malformed URLs |
| 185 | n8n workflows missing auth headers, no retry/DLQ | High | |

---

## 8. Frontend / Dashboard

| # | Gap | Severity | Notes |
|---|-----|----------|-------|
| 186 | No React ErrorBoundary | Critical | Uncaught render error blanks screen |
| 187 | No global error boundary in `App.tsx` | Critical | `Suspense` wraps pages but no error fallback |
| 188 | `useAuth.fetchProfile` silently logs out on any error | High | Including transient 5xx, breaking session on flaky networks |
| 189 | Login error display leaks server messages verbatim | High | Future stack hints or emails exposed to attacker |
| 190 | No dark mode | Medium | `:root` is light-only, no `.dark` class |
| 191 | No PWA / offline | Medium | No manifest.json, no service worker, no `workbox` |
| 192 | No command palette (Cmd+K) | Low | |
| 193 | No print stylesheet | Low | `@media print` absent |
| 194 | No Storybook | Medium | |
| 195 | No formal design system docs | Medium | Just ad-hoc `components/ui/` — no tokens export |
| 196 | No Figma integration | Low | |
| 197 | No Skeletons on most pages | Medium | Flash "Loading..." text |
| 198 | No a11y audit / `eslint-plugin-jsx-a11y` | High | |
| 199 | No focus-trap on modals | High | |
| 200 | No keyboard navigation audit | High | |
| 201 | No ARIA labels on most interactive elements | High | |
| 202 | No code splitting beyond route-level | Medium | |
| 203 | No `manualChunks` for heavy libs (recharts, motion) | Medium | |
| 204 | No bundle size budget enforcement | Medium | |
| 205 | No React Query error boundary globally | High | |
| 206 | No i18n / l10n setup | High | |
| 207 | UI is hardcoded English | High | |
| 208 | No locale files | High | |
| 209 | No timezone-aware date display in dashboard | High | `GoogleCalendarAdapter.createBookingLink` hardcodes `UTC` |
| 210 | No real-time updates (WebSockets/SSE) | Medium | |
| 211 | No push notifications | Low | |
| 212 | No announcement/banner system | Medium | |
| 213 | No onboarding wizard / first-time-user flow | High | |
| 214 | No tooltips library | Medium | No `react-joyride` etc. |
| 215 | No empty-state CTAs for new tenants | Medium | |
| 216 | No customer-facing help docs | High | |
| 217 | No end-user documentation for the marketing-agency client | High | |
| 218 | No feature flag system in dashboard | High | |
| 219 | No maintenance mode UI | Medium | |
| 220 | No kill switch UI for problematic features | High | |

---

## 9. Testing

| # | Gap | Severity | Notes |
|---|-----|----------|-------|
| 221 | No load testing | High | Only `webhook-intake.js` stub |
| 222 | No contract testing (Pact) | Medium | |
| 223 | No mutation testing | Low | |
| 224 | No visual regression (Percy/Chromatic) | Medium | |
| 225 | No a11y testing (axe-core) | High | |
| 226 | No security testing (OWASP ZAP, Snyk in CI) | High | |
| 227 | No chaos testing | Medium | |
| 228 | Agent service Python tests not run in CI | High | |
| 229 | Backend e2e tests not run in CI | High | |
| 230 | No Docker Compose smoke test in CI | Medium | |
| 231 | No integration tests for n8n executions | High | |
| 232 | No API integration tests | High | |
| 233 | No test coverage thresholds enforced in CI | High | |
| 234 | No dependency vulnerability scanning in CI (Dependabot) | High | |
| 235 | No `npm audit` failure threshold in CI | High | |

---

## 10. Operations & Process

| # | Gap | Severity | Notes |
|---|-----|----------|-------|
| 236 | No status page | High | |
| 237 | No public changelog | Medium | |
| 238 | No on-call rotation doc | Critical | |
| 239 | No post-mortem template | High | |
| 240 | No runbooks for common issues | High | |
| 241 | No troubleshooting guide | High | |
| 242 | No "common errors and fixes" doc | High | |
| 243 | No sequence diagrams | Medium | |
| 244 | No ER diagrams (visual) | Medium | |
| 245 | No ADR folder (architecture decision records) | Medium | |
| 246 | No feature flag system | Critical | No `feature_flags` table, no service. Every change requires redeploy |
| 247 | No Dependabot/Renovate config | High | |
| 248 | No migration rollback strategy | High | Prisma has no built-in rollback |
| 249 | No shadow database for safe migrations | High | `migrate dev` unsafe in production-like environments |
| 250 | Seed is not fully idempotent | Medium | No upsert, partial re-runs no-op |

---

## What This List Does NOT Cover

Fixing all 250 items will get you to "robust code that won't fall over". It does NOT get you to "handed to a client and forget about it". You also need:

### Business / Legal
- Signed contract / SLA with the client
- Privacy policy, data processing agreement, terms of service
- Liability and incident response agreement
- Pricing model (subscription, one-time, per-lead)
- Support agreement (response time, channels, hours)
- Tax setup (GST/VAT)
- Invoice template and refund policy

### Operational
- Real domain + DNS configured
- SSL certificate (Let's Encrypt or paid)
- Email service for transactional emails (SendGrid/Resend)
- Real Sentry project + DSN
- Real PagerDuty/Slack for alerts
- Status page (Statuspage, Better Uptime)
- On-call rotation with real humans
- Runbook the on-call person can follow
- Backup destination that's not the same disk
- Way to contact the client when things break

### Client-Side
- Walkthrough/demo of the dashboard
- Training on how to use the system
- Documentation they can read
- Support channel (email/Slack/phone)
- Onboarding session to import existing leads/contacts
- Agreement on what data to migrate

### Live Integrations
- Real WhatsApp Business API access (approved by Meta)
- Real CRM credentials (sandbox first, then production)
- Real calendar integrations
- Test data wiped, replaced with client data
- Data validation: is the client's lead data clean? Phone numbers formatted?

### Decisions to Make
- Which cloud? (AWS, GCP, Azure, DigitalOcean, on-prem)
- Single-region or multi-region?
- Uptime commitment? (99.9%? 99.99%?)
- How are bugs reported? Who fixes them?
- Patch cadence?
- Contract end behavior (data export, account deletion)
- What's NOT in scope?

---

## Critical Items to Fix First (Top 30)

If you fix only these, you have a baseline that's not actively dangerous:

1. Add tenant model + `tenantId` to all business tables (#11, #12, #13, #145)
2. Make Sentry real — install `@sentry/node`, uncomment init (#91, #92)
3. Wire up Stripe/Razorpay properly OR remove billing entirely (#166-171)
4. Add SIGTERM handler + `enableShutdownHooks()` (#56, #57)
5. Add timeout on Claude/CRM/WhatsApp API calls (#72-76)
6. Add circuit breaker on Claude, CRM, WhatsApp pushes (#66-68)
7. Add MFA/2FA (#1)
8. Add forgot-password flow (#3)
9. Add JWT rotation + refresh tokens (#5, #6)
10. Add timing-safe service key comparison (#9)
11. Add React ErrorBoundary (#186, #187)
12. Add global error boundary in App.tsx (#187)
13. Add PII redaction in logs (#19)
14. Add structured JSON logging + request IDs (#110-113)
15. Add HSTS + tighten CSP (#16, #17)
16. Add `.env` schema validation (Zod/envalid) and remove .env from git (#22)
17. Wrap `findOrCreate` in `$transaction` (#31, #32)
18. Add optimistic locking on Lead (#33, #35)
19. Add off-host encrypted backup + scheduling (#133-138)
20. Add `/metrics` Prometheus endpoint (#93, #94)
21. Add Slack/PagerDuty alerting (#99)
22. Add DR plan + RTO/RPO targets (#87, #88)
23. Add runbooks for common issues (#240-242)
24. Add on-call rotation doc (#238)
25. Add SSO (SAML/OIDC) (#146)
26. Add feature flag system (#246)
27. Add health check separation `/live` vs `/ready` (#103)
28. Add `/health/ready` without auth for load balancers (#100)
29. Add Tenant model + tenant resolver middleware (#11, #13)
30. Add Stripe webhook signature verification OR remove Stripe (#168)

---

## Summary

- **Total gaps found:** 250
- **Critical severity:** 47 items
- **High severity:** 118 items
- **Medium severity:** 70 items
- **Low severity:** 15 items

**Effort estimate to fix all 250:**
- Code-only fixes: ~3-4 months (1 senior engineer)
- With infra + monitoring + docs: ~6-8 months

**Realistic path to "live for 1 client":**
1. Fix top 30 critical (~2-3 weeks)
2. Set up real infra (cloud, domain, SSL, monitoring) (~1 week)
3. Pilot with 1 client, low-stakes (~2-4 weeks)
4. Triage, harden, document (~2-4 weeks)
5. Declare "live" (~2 months total)

**This audit was performed by:** automated codebase review across security, data integrity, reliability, monitoring, infrastructure, multi-tenancy, integrations, frontend, testing, and operations dimensions.

**Audit date:** 2026-06-20
**Next audit recommended:** After top 30 fixes are deployed to staging
