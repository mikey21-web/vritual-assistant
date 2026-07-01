# Production Readiness Fix Plan

**Source:** `docs/PRODUCTION_READINESS_AUDIT.md` (250 items)
**Strategy:** Group by system/dependency, prioritize risk reduction.

---

## Phase 1: Critical Security & Auth

### 1.1 Forgot Password / Reset Flow (#3)
- `backend/src/auth/auth.controller.ts`, `auth.service.ts`, `auth.module.ts`
- New: `POST /auth/forgot`, `POST /auth/reset`
- New model: `PasswordResetToken` in `schema.prisma`

### 1.2 JWT Rotation + Refresh Tokens (#5, #6)
- `backend/src/auth/auth.service.ts`, `jwt.strategy.ts`, `auth.controller.ts`
- New: `POST /auth/refresh`, token revocation, `active` check

### 1.3 MFA/2FA (#1)
- `backend/src/auth/auth.service.ts`, `auth.controller.ts`, `auth.module.ts`
- TOTP via `otplib`, new login flow with `requireMfa` challenge

### 1.4 Timing-Safe Key Comparison (#9)
- `backend/src/auth/jwt-auth.guard.ts` — use `crypto.timingSafeEqual`

### 1.5 Password Complexity (#2)
- `backend/src/auth/dto/register.dto.ts` — custom validator

### 1.6 HSTS + Tighter CSP (#16, #17)
- `backend/src/main.ts` — Helmet config

### 1.7 .env Schema Validation (#22)
- New validation module, `zod` or `envalid`

## Phase 2: Backend Reliability

### 2.1 Graceful Shutdown (#56, #57)
- `backend/src/main.ts` — SIGTERM handler, `enableShutdownHooks()`

### 2.2 API Timeouts (#72-76)
- Global HTTP timeout middleware, AbortController for outbound calls

### 2.3 Circuit Breakers (#66-68)
- Wrap Claude, CRM, WhatsApp with configurable circuit breaker

### 2.4 Transaction Wrapping (#31, #32, #35)
- Wrap `findOrCreate` and webhook flows in `$transaction`

### 2.5 Optimistic Locking (#33, #35)
- Add `version` field to Lead/Contact, update with version check

### 2.6 Unhandled Rejection / Exception (#59-62)
- `process.on('unhandledRejection')`, `process.on('uncaughtException')`

## Phase 3: Monitoring & Observability

### 3.1 Sentry (#91, #92)
- `npm install @sentry/node`, wire init in `sentry.service.ts`

### 3.2 Prometheus Metrics (#93, #94)
- `prom-client`, `/metrics` endpoint, request/DB/queue metrics

### 3.3 Health Check Separation (#100, #103)
- `/health/live` (always 200), `/health/ready` (checks DB+Redis, no auth)

### 3.4 JSON Logging + Request IDs (#110-113)
- `nestjs-pino`, `AsyncLocalStorage` for correlation IDs

### 3.5 PII Redaction (#19)
- Redact email/phone/token fields from logs

## Phase 4: Frontend Resilience

### 4.1 React Error Boundary (#186, #187)
- New ErrorBoundary component, wrap app in App.tsx

### 4.2 Auth Error Handling (#188, #189)
- Differentiate 401 vs 5xx, sanitize error display

### 4.3 Skeleton Loading States (#197)
- Audit pages, add skeletons where missing

### 4.4 Code Splitting (#202, #203)
- Vite manualChunks for recharts, motion

## Phase 5: Data Integrity & Persistence

### 5.1 Multi-Replica Idempotency (#37)
- Redis-backed idempotency in agent service

### 5.2 Soft Delete + GDPR (#38, #40-41)
- `deletedAt` on Lead/Contact, export/hard-delete endpoints

### 5.3 Table Pruning Workers (#51-55)
- BullMQ cron for WebhookEvent, AutomationEvent, OutboxMessage, etc.

### 5.4 Off-Host Encrypted Backup (#133-138)
- Custom pg_dump, gpg encryption, S3 shipping, WAL archiving

## Phase 6: Feature Flags & Operations

### 6.1 Feature Flag System (#246)
- New model + service + frontend hook

### 6.2 Operations Docs (#238-242)
- Runbooks for common failure modes

---

## Verification
After each phase: `npm run build`, `npm test`, `node scripts/verify-production.js`
