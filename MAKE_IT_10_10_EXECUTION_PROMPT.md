# Plan: Make Lead Automation Platform 10/10 Production Ready
Date: 2026-06-12
Goal: Convert the current working product into a verified production handover build for a real client.
Architecture: NestJS backend, Prisma/PostgreSQL, Redis/BullMQ, Next.js dashboard, n8n workflows, Docker deployment.
Tech Stack: TypeScript, NestJS, Prisma, PostgreSQL, Redis, BullMQ, Next.js, n8n, Docker.
Branch: `production-hardening-10-10`

## Copy-Paste Prompt For The IDE

You are working on a production lead automation platform. Do not hallucinate. Do not claim anything is complete unless it is proven by code, tests, build output, or working endpoint behavior.

Your job is to make this project 10/10 production-ready for a real client handover.

Read these files first:

- `FULL_AUDIT_REPORT.md`
- `PRODUCTION_BUILD_GUIDE.md`
- `backend/prisma/schema.prisma`
- `backend/src/app.module.ts`
- `docker-compose.yml`
- `.env.example`
- all files under `n8n/workflows/`

Rules:

- Do not delete existing working features.
- Do not weaken security to make tests pass.
- Do not replace real checks with fake success responses.
- Do not say "done" unless the acceptance checklist at the bottom passes.
- Do not use placeholder production behavior.
- Do not leave `TODO`, fake, stub, simulated, or "validated" success logic for real integrations.
- Do not expose passwords, API keys, tokens, or secrets in API responses or logs.
- Do not allow public users to create admin/owner accounts.
- Do not allow dashboard users to access routes outside their role.
- Do not allow public webhooks without API key/signature validation.
- Do not use default production secrets.

## Current State

Recent checks show:

- Backend TypeScript passes.
- Dashboard TypeScript passes.
- n8n JSON files are valid.
- Advanced Prisma migration entries exist.
- Obvious DTO gaps were reduced to zero.
- CRM mapping test now calls adapter health checks.
- Booking settings test now calls adapter health checks.
- Automation retry processor now dispatches to n8n/backend.

This is much better, but it is not automatically 10/10 until full production verification passes.

## Files To Review Before Editing

- `backend/src/auth/auth.service.ts`
- `backend/src/users/users.service.ts`
- `backend/src/webhooks/webhooks.controller.ts`
- `backend/src/shared/webhook-security.service.ts`
- `backend/src/automation-events/automation-events.processor.ts`
- `backend/src/crm-mappings/crm-mappings.service.ts`
- `backend/src/booking-settings/booking-settings.service.ts`
- `backend/src/integrations/integrations.service.ts`
- `backend/src/shared/adapters/crm.adapter.ts`
- `backend/src/shared/adapters/calendar.adapter.ts`
- `backend/src/shared/adapters/messaging.adapter.ts`
- `backend/src/shared/adapters/email.adapter.ts`
- `backend/src/advanced-features/advanced-features.controller.ts`
- `backend/src/advanced-features/advanced-features.service.ts`
- `dashboard/src/app/(dashboard)/advanced/page.tsx`
- `dashboard/src/lib/api.ts`
- `n8n/workflows/*.json`

## Phase 1: Prove The Current Build

Run these commands and fix any failure.

Backend:

```bash
cd backend
npx prisma validate
npx prisma generate
npx tsc --noEmit --incremental false
npm test -- --runInBand
npm run build
```

Dashboard:

```bash
cd dashboard
npx tsc --noEmit --incremental false
npm run build
```

n8n:

```bash
node -e "const fs=require('fs'); const path='n8n/workflows'; for (const f of fs.readdirSync(path).filter(x=>x.endsWith('.json'))) JSON.parse(fs.readFileSync(path+'/'+f,'utf8')); console.log('all n8n json valid')"
```

Docker:

```bash
docker compose config
```

Acceptance:

- All commands pass.
- No command is skipped.
- Any failure is fixed at root cause.

## Phase 2: Database And Migration Integrity

Check that `backend/prisma/schema.prisma` and migrations match.

Required models must be covered by migrations:

- `PipelineStage`
- `SavedFilter`
- `InternalNote`
- `BlocklistEntry`
- `NotificationPreference`
- `SlaRule`
- `RevenueRecord`
- `ImportExportLog`
- `LeadOwnershipHistory`
- all existing core lead/contact/campaign/form/QR/conversation/conversion models

Run:

```bash
cd backend
npx prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --script
```

Acceptance:

- No unexpected destructive migration.
- Fresh database can be created with `npx prisma migrate deploy`.
- Prisma client generates cleanly.

## Phase 3: Security Hardening

Audit all controllers.

Required:

- No `@Body() d: any`.
- No unsafe public mutation routes except intentional webhooks.
- Webhooks require API key or provider signature.
- JWT auth protects dashboard APIs.
- Role guard protects admin/owner routes.
- No password/token/secret is returned in responses.
- CORS is locked by env config.
- Rate limiting is enabled.
- File upload size and type limits exist.

Commands:

```bash
rg -n "@Body\\([^)]*\\).*:\\s*any|@Query\\([^)]*\\).*:\\s*any" backend/src
rg -n "password|apiKey|accessToken|clientSecret|privateKey" backend/src
rg -n "@UseGuards|@Roles|@Post|@Patch|@Delete" backend/src
```

Acceptance:

- Any remaining `any` is internal-only and justified.
- Every mutation endpoint has DTO validation.
- Every admin route has role protection.
- Public webhooks validate secrets before processing.

## Phase 4: Real Integration Behavior

Do not leave fake success methods.

Required:

- `CrmMappingsService.test()` must call real adapter health checks.
- `BookingSettingsService.test()` must call real provider health checks.
- `IntegrationsService.test()` must call real provider health checks.
- Failed credentials must return failed/unhealthy, not success.
- Missing credentials must return clear failed status.
- Provider secrets must be redacted.

Adapters:

- HubSpot: health check and push lead.
- Salesforce: health check at minimum; push lead if credentials are configured.
- Zoho: health check at minimum; push lead if credentials are configured.
- Calendly: health check and booking link/event flow.
- Google Calendar: health check and availability/booking behavior.
- WhatsApp: send message through real configured provider.
- Email: send through SMTP/provider and report failure.

Acceptance:

- No code returns success without calling a provider or explicitly marking itself disabled/unconfigured.
- Provider failures are logged into audit/failure systems.

## Phase 5: n8n Production Workflows

Review all workflow files under `n8n/workflows/`.

Required:

- Valid JSON.
- Correct backend URLs.
- Correct auth headers.
- Correct webhook paths.
- Failure branch exists.
- Retry/failure event is sent to backend.
- No malformed URL like `/leads/={{ ... }}`.
- Environment variables are documented in `.env.example`.

Acceptance:

- Every workflow can be imported into n8n.
- Every workflow has a clear trigger.
- Every workflow calls backend securely.
- Failed workflow execution creates a failure inbox event.

## Phase 6: Advanced Client-Proof Features

Make sure these are not only database tables. They must have useful backend behavior and dashboard access where needed.

Required:

- Pipeline stages: CRUD plus lead stage update.
- Saved filters: create, list, delete, apply in dashboard.
- Ownership history: recorded when a lead assignment changes.
- Duplicate merge: merge contacts/leads with audit trail.
- Internal notes: notes attached to leads; safe access by role.
- Blocklist: checked during lead capture before creating a lead.
- Notification preferences: actually used before sending alerts.
- SLA rules: evaluated by scheduled job or processor.
- Revenue tracking: connected to conversion/campaign ROI.
- Import/export: real CSV upload/export, not only log rows.
- Data retention: configurable rule, not only hardcoded purge.
- Failure inbox: list failures and retry selected item.
- Sandbox mode: test without sending real customer messages.

Acceptance:

- Each feature has backend route, service logic, dashboard UI if client-facing, and at least one test.

## Phase 7: Testing Required For 10/10

Add missing tests.

Backend tests:

- Auth registration cannot create owner/admin.
- User create/update hashes password.
- Role guard blocks unauthorized access.
- Webhook rejects invalid API key/signature.
- Webhook accepts valid API key/signature.
- Duplicate webhook is idempotent.
- CRM test fails with bad credentials.
- Booking test fails with bad credentials.
- Automation retry marks success/failure correctly.
- Blocklist prevents lead creation.
- SLA rule creates escalation/failure event.
- CSV import handles duplicates.
- Export filters by campaign/status/date.

Dashboard tests or E2E:

- Login flow.
- Lead list loads.
- Campaign create/edit.
- Form create/edit.
- QR create.
- Advanced page tabs load.
- Failure inbox retry action.
- Role-restricted UI does not show forbidden actions.

Acceptance:

```bash
cd backend
npm test -- --runInBand
npm run build

cd ../dashboard
npm run build
```

Optional but ideal:

```bash
npx playwright test
```

## Phase 8: Deployment Readiness

Check:

- `docker-compose.yml` has no unsafe default secrets.
- n8n image is pinned.
- Postgres and Redis are pinned.
- Production env variables are listed in `.env.example`.
- App fails loudly if required secrets are missing.
- Database backups are documented.
- Restore process is documented.
- Logs are structured.
- Health endpoint exists.
- Admin health page exists or documented.

Acceptance:

```bash
docker compose config
docker compose build
```

Do not deploy until config passes and secrets are real.

## Phase 9: Final Production Acceptance Checklist

Only say "10/10 done" when all are true:

- Backend tests pass.
- Backend build passes.
- Dashboard build passes.
- Prisma migration deploy works on fresh DB.
- n8n workflows import cleanly.
- n8n workflows execute with auth.
- Webhooks reject invalid signatures/keys.
- Webhooks accept valid signatures/keys.
- CRM test calls a real provider or returns honest unconfigured failure.
- Booking test calls a real provider or returns honest unconfigured failure.
- Automation retry dispatches and records result.
- Failure inbox can retry failed events.
- No public admin creation.
- No raw password storage.
- No secrets in API responses.
- No default production secrets.
- Role permissions tested.
- File uploads have type/size checks.
- Import/export works with real CSV.
- Advanced features are connected to real flows.
- Client dashboard does not expose master templates or hidden admin-only configs.
- README has production setup steps.
- `.env.example` lists every required variable.
- Full handover docs exist.

## Final Rating Rules

Use this rating honestly:

- 10/10: all acceptance checks pass with real tests and real provider behavior.
- 9/10: production-safe, but missing minor UI polish or optional provider.
- 8/10: strong product, but not all E2E/provider tests are proven.
- 7/10: good internal build, still risky for client handover.
- 6/10 or below: scaffold or partially productionized.

Current target:

Move from roughly 8/10 to 10/10 by proving build, tests, migrations, n8n execution, real integrations, advanced workflows, and deployment safety.

