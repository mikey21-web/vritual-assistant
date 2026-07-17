# Plan: Indian Builder Operating System
Date: 2026-07-17
Goal: Small Indian builders can run lead capture, WhatsApp/call follow-up, site visits, inventory, bookings, payments, and channel partners from one affordable workspace.
Architecture: Add a builder command endpoint, then layer focused real-estate workflows on the existing NestJS backend, Prisma data model, React dashboard, agent service, and automation jobs.
Tech Stack: NestJS, Prisma, PostgreSQL, BullMQ/Redis, React 19, Vite, Tailwind CSS, FastAPI/LangGraph agent service
Branch: feature/indian-builder-os

## Files Changed
- `backend/src/analytics/analytics.service.ts` - add `/analytics/builder-command` aggregator backing the builder desk.
- `backend/src/analytics/analytics.controller.ts` - expose the builder command endpoint.
- `dashboard-v2/src/lib/data.ts` - add `fetchBuilderCommand()`.
- `dashboard-v2/src/pages/BuilderDeskPage.tsx` - new builder-focused command center.
- `dashboard-v2/src/App.tsx` - route `#/builder-desk`.
- `dashboard-v2/src/components/layout/sidebar.tsx` - add Builder Desk navigation.

## Phase 1: Builder Revenue Desk

## Step 1: Add Builder Command API
**Files**: `backend/src/analytics/analytics.service.ts`, `backend/src/analytics/analytics.controller.ts`

**Test first**:
Add a service test in `backend/src/analytics/analytics.service.spec.ts` that mocks counts for leads, bookings, projects, units, channel partners, payment schedules, and source groups.
Run: `npm test -- analytics.service.spec.ts` from `backend` -> should fail before implementation.

**Implementation**:
Add `builderCommand()` returning:
- revenue desk KPIs: active leads, hot leads, unassigned leads, today's visits, overdue payments
- portal/source breakdown
- inventory summary by unit status
- latest leads with buyer context
- upcoming site visits
- payment collection queue
- partner summary

**Verify**: Endpoint returns a single JSON payload from `GET /analytics/builder-command`.

## Step 2: Add Builder Desk Page
**Files**: `dashboard-v2/src/pages/BuilderDeskPage.tsx`, `dashboard-v2/src/lib/data.ts`

**Test first**:
Create `dashboard-v2/src/test/pages/BuilderDeskPage.test.tsx` rendering the page with mocked `fetchBuilderCommand()` and asserting the lead desk KPIs and source breakdown are visible.
Run: `npm test -- BuilderDeskPage.test.tsx` from `dashboard-v2` -> should fail before page implementation.

**Implementation**:
Render:
- top KPI strip
- urgent lead queue
- upcoming site visits
- source quality cards
- inventory availability cards
- overdue collections queue
- recommended next actions

**Verify**: Page renders with mock API data and handles empty/error states.

## Step 3: Wire Navigation
**Files**: `dashboard-v2/src/App.tsx`, `dashboard-v2/src/components/layout/sidebar.tsx`

**Test first**:
Extend an existing routing/sidebar test or manually verify `#/builder-desk` resolves to `BuilderDesk`.

**Implementation**:
Add the lazy page, route mapping, feature mapping, and sidebar item.

**Verify**: `npm run lint` in `dashboard-v2` passes.

## Phase 2: Portal Lead Autopilot

## Step 4: Trigger AI/WhatsApp Follow-Up After Portal Lead Intake
**Files**: `backend/src/portal-integrations/portal-integrations.service.ts`, `backend/src/agent/agent-client.service.ts`, `backend/src/automation/followup-processor.service.ts`

**Test first**:
Mock a MagicBricks payload and assert the portal service creates the lead and schedules an immediate follow-up action.

**Implementation**:
After dedupe/create, enqueue:
- instant WhatsApp acknowledgement
- agent summary/qualification task
- SLA clock event
- owner alert if lead remains unassigned after 10 minutes

**Verify**: Portal webhook returns created lead and scheduled follow-up metadata.

## Step 5: Add Portal Connector Health
**Files**: `backend/src/portal-integrations/portal-integrations.service.ts`, `dashboard-v2/src/pages/WebhookPage.tsx`

**Test first**:
Assert each portal shows last lead received, last error, and lead count in 7 days.

**Implementation**:
Expose portal health from stored `IntegrationEvent` records and display it in the dashboard.

**Verify**: Failed portal payloads show action needed instead of silent failure.

## Phase 3: Site Visit OS

## Step 6: Make Site Visits First-Class
**Files**: `backend/prisma/schema.prisma`, `backend/src/bookings/*`, `dashboard-v2/src/pages/SiteVisitsPage.tsx`

**Test first**:
Create booking lifecycle tests for scheduled, confirmed, done, no-show, rescheduled, and cancelled visit statuses.

**Implementation**:
Add site visit-specific fields: projectId, unitId, assignedAgentId, checkInAt, outcome, noShowReason, feedback, nextActionAt.

**Verify**: Visit reminders and post-visit follow-ups continue to work.

## Phase 4: Inventory To Booking

## Step 7: Add Unit Hold And Booking Locks
**Files**: `backend/prisma/schema.prisma`, `backend/src/projects/projects.service.ts`, `dashboard-v2/src/pages/ProjectDetailPage.tsx`

**Test first**:
Assert two agents cannot hold/book the same unit at the same time.

**Implementation**:
Add holdExpiresAt, heldByLeadId, bookedByLeadId, bookingAmount, and status transition validation.

**Verify**: Expired holds release automatically and status history stays complete.

## Step 8: Add Cost Sheet Generator
**Files**: `backend/prisma/schema.prisma`, `backend/src/cost-sheets/*`, `dashboard-v2/src/pages/CostSheetsPage.tsx`

**Test first**:
Assert GST, stamp duty, registration, parking, floor rise, PLC, discount, and total agreement value are calculated.

**Implementation**:
Generate downloadable/shareable cost sheets linked to lead and unit.

**Verify**: Sales can send one cost sheet from the lead detail workflow.

## Phase 5: Collections And Documents

## Step 9: Demand Letter Automation
**Files**: `backend/src/payment-schedules/*`, `backend/src/message-templates/*`, `dashboard-v2/src/pages/PaymentSchedulesPage.tsx`

**Test first**:
Assert a construction milestone creates a demand letter event and WhatsApp/email send job.

**Implementation**:
Add demand letter template variables, generated PDF/HTML, delivery tracking, and payment status.

**Verify**: Overdue queue updates when paid/waived.

## Phase 6: Channel Partner Portal

## Step 10: Partner Lead Registration And Duplicate Lock
**Files**: `backend/src/channel-partners/*`, `dashboard-v2/src/pages/ChannelPartnersPage.tsx`

**Test first**:
Assert a partner cannot register a duplicate buyer phone already owned by another active partner.

**Implementation**:
Add partner login/token, lead registration form, inventory visibility, commission tracker.

**Verify**: Partner performance includes registered, accepted, duplicate, visit, booking, and payout counts.

## Rollback Strategy
Keep each phase behind navigation and API boundaries. If a phase is unstable, remove the sidebar item and leave existing lead, project, booking, and payment modules untouched.
