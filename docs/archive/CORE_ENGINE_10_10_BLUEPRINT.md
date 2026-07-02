# Core Engine 10/10 Blueprint

Date: 2026-06-13

Project: Virtual Assistant Lead Capture, Nurture, And Conversion Platform

Scope: Core engine only. This file does not design niche templates. Niche templates can sit on top later, but this document focuses on making the underlying product engine powerful, reliable, secure, observable, and production-ready.

## One-Line Goal

Build a core automation engine where every lead action becomes an event, every automation is rule-driven, every failure is tracked and retryable, every user action is permission-checked, and every client-facing workflow is observable from the dashboard.

## Copy-Paste Prompt For The IDE

You are working on a production lead automation platform.

Your job is to upgrade the core engine to a true 10/10 production system.

Do not build niche templates in this task.

Do not hallucinate features.

Do not claim anything is complete unless it exists in code, has database support if needed, has API routes if needed, has dashboard support if client-facing, and has tests or verification commands proving it works.

Read these files first:

- `FULL_AUDIT_REPORT.md`
- `MAKE_IT_10_10_EXECUTION_PROMPT.md`
- `PRODUCTION_BUILD_GUIDE.md`
- `backend/prisma/schema.prisma`
- `backend/src/app.module.ts`
- `backend/src/automation-events/automation-events.processor.ts`
- `backend/src/advanced-features/advanced-features.service.ts`
- `backend/src/shared/adapters/`
- `dashboard/src/app/(dashboard)/`
- `n8n/workflows/`
- `.env.example`
- `docker-compose.yml`

Your final result must make the core platform event-driven, rule-driven, failure-safe, permission-safe, integration-safe, and observable.

## Do Not Cross These Lines

- Do not hardcode client-specific business logic.
- Do not add niche-specific fields into the core schema unless they are custom fields.
- Do not make n8n the brain of the system.
- Do not let n8n own source-of-truth state.
- Do not return fake success from integrations.
- Do not swallow failed automation errors.
- Do not process public webhooks without auth/signature checks.
- Do not store raw provider secrets in plain API responses.
- Do not expose master/admin-only settings to normal users.
- Do not allow role checks to be inconsistent route by route.
- Do not create untested critical flows.
- Do not mark the project 10/10 until all acceptance checks pass.

## Core Engine Principles

### 1. Backend Is The Brain

The backend owns:

- lead state
- contact state
- workflow state
- automation event state
- retry state
- permissions
- integration status
- timeline history
- audit logs

n8n only executes external automation steps.

### 2. Everything Important Becomes An Event

Examples:

- lead created
- lead updated
- QR scanned
- form submitted
- WhatsApp message received
- message sent
- score changed
- segment changed
- lead assigned
- task created
- follow-up due
- SLA breached
- CRM push requested
- CRM push succeeded
- CRM push failed
- booking requested
- booking confirmed
- payment received
- file uploaded
- automation failed
- automation retried

### 3. Rules Drive Automation

Avoid scattered hardcoded logic.

Rules should decide:

- scoring
- segmentation
- routing
- SLA escalation
- nurture trigger
- message trigger
- follow-up trigger
- conversion trigger
- notification trigger

### 4. Failures Are First-Class

Every failed external action must create a failure record.

Failures must be:

- visible
- searchable
- assigned a reason
- retryable
- auditable
- connected to the related lead/contact/campaign/integration

### 5. Permissions Are Central

Every route should use a central permission matrix.

Do not rely only on scattered `@Roles()` checks without a documented policy.

### 6. Integrations Use Adapters

Every provider must follow a standard interface.

Examples:

- CRM adapter
- Messaging adapter
- Email adapter
- Calendar adapter
- Storage adapter
- Payment adapter

### 7. Timeline Is Separate From Audit

Audit log is for security and accountability.

Lead timeline is for humans using the dashboard.

Both are needed.

## Required Core Engines

## 1. Event Engine

### Purpose

Create one reliable system for recording and publishing all important system events.

### Build

Create or strengthen:

- `backend/src/events/`
- `backend/src/events/events.module.ts`
- `backend/src/events/events.service.ts`
- `backend/src/events/events.controller.ts`
- `backend/src/events/dto/create-event.dto.ts`

### Database

Add or confirm a model like:

```prisma
model SystemEvent {
  id              String   @id @default(uuid())
  type            String
  source          String
  status          String   @default("pending")
  entityType      String?
  entityId        String?
  leadId          String?
  contactId       String?
  campaignId      String?
  payload         Json
  metadata        Json?
  correlationId   String?
  idempotencyKey  String?  @unique
  createdById     String?
  createdAt       DateTime @default(now())
  processedAt     DateTime?

  @@index([type])
  @@index([status])
  @@index([leadId])
  @@index([entityType, entityId])
  @@index([correlationId])
}
```

### Rules

- Every core service mutation should emit a `SystemEvent`.
- Webhooks must create events after validation.
- Duplicate webhook payloads must not create duplicate events.
- Events must support idempotency keys.
- Events must be queryable from admin/debug dashboard.

### Acceptance

- Creating a lead creates a `lead.created` event.
- Updating lead score creates a `lead.score_changed` event.
- CRM push failure creates `crm.push_failed`.
- Booking request creates `booking.requested`.
- Duplicate webhook does not duplicate events.

## 2. Rule Engine

### Purpose

One rule system should evaluate lead data and decide actions.

### Build

Create or strengthen:

- `backend/src/rules/`
- `backend/src/rules/rules.module.ts`
- `backend/src/rules/rules.service.ts`
- `backend/src/rules/rule-evaluator.service.ts`
- `backend/src/rules/dto/create-rule.dto.ts`
- `backend/src/rules/dto/test-rule.dto.ts`

### Database

Add or confirm:

```prisma
model AutomationRule {
  id          String   @id @default(uuid())
  name        String
  category    String
  eventType   String?
  priority    Int      @default(100)
  conditions  Json
  actions     Json
  active      Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([category])
  @@index([eventType])
  @@index([active])
}

model RuleExecution {
  id          String   @id @default(uuid())
  ruleId      String
  eventId     String?
  result      String
  input       Json
  output      Json?
  error       String?
  createdAt   DateTime @default(now())

  @@index([ruleId])
  @@index([eventId])
}
```

### Supported Conditions

Must support:

- equals
- not equals
- contains
- not contains
- greater than
- less than
- between
- exists
- not exists
- in list
- not in list
- date before
- date after

### Supported Actions

Must support:

- add score
- subtract score
- set segment
- set status
- assign user
- create task
- send notification
- start nurture sequence
- request CRM push
- request appointment booking
- create failure if action fails

### Acceptance

- Rule test endpoint returns matched/not matched and why.
- Rule execution is logged.
- Bad rule JSON is rejected by DTO validation.
- Failed action creates a failure record.

## 3. Workflow State Engine

### Purpose

Track where every lead is inside automation. n8n executes steps, but backend owns state.

### Build

Create:

- `backend/src/workflow-state/`
- `backend/src/workflow-state/workflow-state.module.ts`
- `backend/src/workflow-state/workflow-state.service.ts`
- `backend/src/workflow-state/workflow-state.controller.ts`

### Database

Add or confirm:

```prisma
model WorkflowInstance {
  id            String   @id @default(uuid())
  workflowType  String
  status        String   @default("running")
  leadId        String?
  contactId     String?
  campaignId    String?
  currentStep   String?
  context       Json
  startedAt     DateTime @default(now())
  completedAt   DateTime?
  failedAt      DateTime?
  failureReason String?

  @@index([workflowType])
  @@index([status])
  @@index([leadId])
}

model WorkflowStepRun {
  id                 String   @id @default(uuid())
  workflowInstanceId String
  stepKey            String
  status             String
  input              Json?
  output             Json?
  error              String?
  startedAt          DateTime @default(now())
  completedAt        DateTime?

  @@index([workflowInstanceId])
  @@index([stepKey])
  @@index([status])
}
```

### Acceptance

- When nurture starts, a workflow instance is created.
- Each step records status.
- Failed step creates failure inbox item.
- Retried step updates state.
- Dashboard can show current workflow state for a lead.

## 4. Failure And Retry Engine

### Purpose

One engine for all failures.

### Build

Create or strengthen:

- `backend/src/failures/`
- `backend/src/failures/failures.module.ts`
- `backend/src/failures/failures.service.ts`
- `backend/src/failures/failures.controller.ts`
- `backend/src/failures/failure-retry.processor.ts`

### Database

Add or confirm:

```prisma
model FailureRecord {
  id             String   @id @default(uuid())
  type           String
  status         String   @default("open")
  severity       String   @default("medium")
  entityType     String?
  entityId       String?
  leadId         String?
  provider       String?
  operation      String?
  message        String
  errorCode      String?
  rawError       Json?
  retryable      Boolean  @default(true)
  attempts       Int      @default(0)
  maxAttempts    Int      @default(5)
  nextRetryAt    DateTime?
  resolvedAt     DateTime?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@index([status])
  @@index([type])
  @@index([leadId])
  @@index([nextRetryAt])
}
```

### Failure Types

Must support:

- webhook failure
- n8n failure
- CRM push failure
- WhatsApp send failure
- email send failure
- booking failure
- payment failure
- import failure
- export failure
- file upload failure
- SLA breach

### Acceptance

- Failure inbox lists all open/retrying failures.
- Retry button triggers actual retry.
- Non-retryable failure cannot be retried.
- Retry attempts are counted.
- Resolved failures stay in history.

## 5. Permission Engine

### Purpose

Centralize permissions so the system is predictable.

### Build

Create:

- `backend/src/permissions/`
- `backend/src/permissions/permissions.module.ts`
- `backend/src/permissions/permissions.service.ts`
- `backend/src/permissions/permission.guard.ts`
- `backend/src/permissions/permissions.matrix.ts`

### Roles

Required roles:

- OWNER
- ADMIN
- MANAGER
- SALES_AGENT
- SUPPORT_AGENT
- VIEWER

### Permission Examples

OWNER:

- everything

ADMIN:

- manage users except owner deletion
- manage integrations
- manage campaigns
- manage rules
- view audit logs

MANAGER:

- manage leads
- manage campaigns
- assign leads
- view reports
- create templates

SALES_AGENT:

- view assigned leads
- update assigned leads
- create notes
- create tasks
- send approved messages

SUPPORT_AGENT:

- view assigned conversations
- reply to support messages
- create notes

VIEWER:

- read-only analytics and reports

### Acceptance

- Permission matrix exists in one file.
- Route guard uses permission keys.
- Tests prove restricted users cannot access admin routes.
- Dashboard hides forbidden actions.
- Backend still enforces permissions even if UI is bypassed.

## 6. Integration Adapter Engine

### Purpose

Make all providers follow a consistent contract.

### Build

Strengthen:

- `backend/src/shared/adapters/crm.adapter.ts`
- `backend/src/shared/adapters/calendar.adapter.ts`
- `backend/src/shared/adapters/messaging.adapter.ts`
- `backend/src/shared/adapters/email.adapter.ts`

Add if needed:

- `backend/src/shared/adapters/payment.adapter.ts`
- `backend/src/shared/adapters/storage.adapter.ts`
- `backend/src/integrations/integration-registry.service.ts`

### Standard Adapter Result

Use one result shape:

```ts
export type AdapterResult<T = unknown> = {
  ok: boolean;
  provider: string;
  operation: string;
  data?: T;
  externalId?: string;
  error?: {
    code?: string;
    message: string;
    retryable: boolean;
    raw?: unknown;
  };
};
```

### Acceptance

- No adapter throws raw provider errors to controllers.
- Every adapter returns `AdapterResult`.
- Every provider health check is real or honestly returns unconfigured.
- Failed adapter calls create `FailureRecord`.
- Successful calls create timeline event.

## 7. Timeline Engine

### Purpose

Give each lead a readable history.

### Build

Create:

- `backend/src/timeline/`
- `backend/src/timeline/timeline.module.ts`
- `backend/src/timeline/timeline.service.ts`
- `backend/src/timeline/timeline.controller.ts`

### Database

Add or confirm:

```prisma
model TimelineItem {
  id          String   @id @default(uuid())
  leadId      String?
  contactId   String?
  type        String
  title       String
  description String?
  metadata    Json?
  createdById String?
  createdAt   DateTime @default(now())

  @@index([leadId])
  @@index([contactId])
  @@index([type])
}
```

### Timeline Events

Must show:

- form submitted
- QR scanned
- lead created
- lead updated
- message received
- message sent
- score changed
- segment changed
- task created
- note added
- file uploaded
- appointment requested
- appointment booked
- CRM push attempted
- CRM push succeeded
- CRM push failed
- conversion recorded
- payment received
- automation failed
- automation retried

### Acceptance

- Dashboard lead detail can show timeline.
- Timeline is readable by humans.
- Audit log remains separate.

## 8. Scheduler Engine

### Purpose

Reliable scheduled jobs for follow-ups, SLA, reconnect, daily summary, and retries.

### Build

Create:

- `backend/src/scheduler/`
- `backend/src/scheduler/scheduler.module.ts`
- `backend/src/scheduler/scheduler.service.ts`
- `backend/src/scheduler/processors/`

### Jobs

Required jobs:

- due follow-ups
- SLA breach detection
- nurture next step
- failure retry
- daily summary
- stale lead reconnect
- import processing
- export generation

### Acceptance

- Jobs are idempotent.
- Jobs log start/end/failure.
- Failed jobs create failure records.
- No job sends duplicate messages.

## 9. Observability Engine

### Purpose

Make production problems visible.

### Build

Create:

- `backend/src/health/`
- `backend/src/health/health.controller.ts`
- `backend/src/health/health.service.ts`
- `backend/src/logging/`

### Health Checks

Must check:

- API server
- database
- Redis
- queue
- n8n URL
- storage
- CRM integration status
- WhatsApp/email provider status
- calendar provider status

### Acceptance

- `/health` returns simple status.
- `/health/deep` returns detailed status for admins.
- Dashboard has health/failure visibility.
- Logs are structured.
- Errors include correlation ID.

## 10. Configuration Engine

### Purpose

Centralize client/product behavior without hardcoding.

### Build

Strengthen:

- `backend/src/business-settings/`
- `backend/src/integrations/`
- `backend/src/custom-fields/`

Add if needed:

- `backend/src/client-config/`

### Config Areas

Must support:

- business info
- timezone
- language
- currency
- working hours
- notification channels
- enabled integrations
- enabled capture channels
- enabled conversion destinations
- sender names
- branding
- data retention settings
- sandbox mode

### Acceptance

- Config is editable by owner/admin only.
- Config changes are audited.
- Config affects actual behavior.
- Config is not only stored and ignored.

## API Route Standards

Every new controller must follow this pattern:

- DTO for body.
- DTO for query.
- auth guard unless intentionally public.
- permission guard for protected actions.
- clear HTTP status.
- clear error response.
- audit log for sensitive mutation.
- timeline item for lead-facing activity.
- failure record if external action fails.

Example route naming:

- `GET /events`
- `POST /events`
- `GET /rules`
- `POST /rules`
- `POST /rules/test`
- `GET /workflow-instances`
- `GET /workflow-instances/:id`
- `POST /workflow-instances/:id/retry-step`
- `GET /failures`
- `POST /failures/:id/retry`
- `POST /failures/:id/resolve`
- `GET /leads/:id/timeline`
- `GET /health`
- `GET /health/deep`

## Dashboard Requirements

Add or strengthen dashboard pages:

- Failure inbox
- Lead timeline
- Workflow state viewer
- Rule builder/tester
- Health dashboard
- Permission-aware navigation
- Integration status page

Dashboard must not be only pretty screens.

Every page must call real backend endpoints.

Every failed API call must show a useful error.

Every protected action must be hidden if the user lacks permission.

## Test Requirements

Backend tests required:

- event creation with idempotency
- rule evaluator condition matching
- rule action execution
- workflow instance state transition
- failure record creation
- failure retry success
- failure retry exhausted
- permission guard owner/admin/manager/sales/viewer
- webhook invalid key rejected
- webhook valid key accepted
- adapter failure creates failure record
- timeline item created on lead action
- scheduler job idempotency
- health endpoint reports dependency failure

Dashboard/E2E tests required:

- login
- lead list
- lead timeline
- failure inbox
- retry failure
- rule test
- integration health page
- forbidden action hidden for viewer

## Required Verification Commands

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

Search checks:

```bash
rg -n "@Body\\([^)]*\\).*:\\s*any|@Query\\([^)]*\\).*:\\s*any" backend/src
rg -n "fake|simulated|TODO|placeholder|processed: true" backend/src
rg -n "dev-secret|admin123|change-me" .
```

Acceptance:

- Backend commands pass.
- Dashboard commands pass.
- n8n JSON check passes.
- Search checks show no production blockers.
- Any intentional non-production string is documented and blocked from production.

## Final 10/10 Acceptance Checklist

The core engine is 10/10 only if all are true:

- Backend is event-driven.
- Rules are centralized.
- Workflow state is tracked in backend.
- n8n is execution-only, not source of truth.
- Failures are stored in one failure inbox.
- Failed external actions are retryable.
- Permissions are centralized.
- Integration adapters use a standard result format.
- Provider failures do not fake success.
- Lead timeline exists and is human-readable.
- Audit log exists and is security-focused.
- Scheduled jobs are idempotent.
- Health endpoints exist.
- Config changes affect real behavior.
- No unsafe public mutation routes.
- Webhooks require auth/signature.
- No secrets leak in responses.
- Tests cover critical flows.
- Backend build passes.
- Dashboard build passes.
- Prisma migration works on fresh DB.
- n8n workflow JSON is valid.
- Deployment config has no unsafe production defaults.

## Final Rating Rule

Use this honestly:

- 10/10: all checklist items pass with proof.
- 9/10: production-safe, only minor UI/reporting polish missing.
- 8/10: strong architecture, but E2E or provider verification incomplete.
- 7/10: good build, but still risky for client handover.
- 6/10 or below: scaffold or partially productionized.

## What To Build First

Priority order:

1. Event engine
2. Failure/retry engine
3. Permission engine
4. Rule engine
5. Workflow state engine
6. Timeline engine
7. Integration adapter standardization
8. Scheduler engine
9. Health/observability
10. Dashboard pages for failure, timeline, rules, health

Do not start niche templates until this core engine is reliable.

