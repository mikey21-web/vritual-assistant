# Current Vs Build Map: Real Estate Builder OS
Date: 2026-07-18
Goal: Show exactly what already exists in this project, what is only partially built, and what must be built to reach the Sell.Do-style small Indian builder OS described in `docs/ sell-do-small-builder-checklist.md`.
Architecture: Use the existing NestJS backend, Prisma/Postgres database, React/Vite dashboard, Python agent service, automation jobs, and Mikey/Jarvis services. Do not restart from scratch.
Tech Stack: NestJS, Prisma, PostgreSQL, BullMQ/Redis, React 19, Vite, Tailwind CSS, FastAPI/LangGraph, Socket.IO.
Branch: feature/indian-builder-os

## How To Read This File

This file is the bridge between the big product vision and the real codebase.

Use it like this:

1. First read `docs/sell-do-small-builder-checklist.md` for the full product vision.
2. Then read this file to know what already exists in this repo.
3. Build only the missing pieces listed here.
4. Keep every feature end-to-end: database, API, UI, automation, tests, audit logs, and failure handling.

## Current Repo Reality

The project is not empty. It already has a strong CRM and automation base.

Existing major apps:

- `backend/` - NestJS API with Prisma/Postgres.
- `dashboard-v2/` - React/Vite dashboard.
- `agent-service/` - Python FastAPI/LangGraph agent service.
- `mobile-android/` - Android call tracking app.
- `n8n/` - workflow automation examples.
- `docs/sell-do-small-builder-checklist.md` - full product blueprint.
- `docs/superpowers/plans/2026-07-17-indian-builder-os.md` - older short implementation plan.

Existing backend modules that matter for real estate:

- `backend/src/leads` - lead creation, status, assignment, scoring base.
- `backend/src/contacts` - buyer identity/contact records.
- `backend/src/conversations` - message history.
- `backend/src/telephony` - call/voice layer.
- `backend/src/call-tracking` - Android call sync support.
- `backend/src/portal-integrations` - IndiaMART, 99acres, JustDial, MagicBricks, Housing.com, TradeIndia lead webhooks.
- `backend/src/projects` - builder project/tower/unit inventory.
- `backend/src/bookings` - booking/site-visit-like scheduling and payment links.
- `backend/src/payment-schedules` - payment milestones and reminders.
- `backend/src/channel-partners` - channel partner records and performance.
- `backend/src/analytics` - analytics and builder command aggregation.
- `backend/src/automation`, `backend/src/automation-events` - automation/event system.
- `backend/src/message-templates` - reusable message templates.
- `backend/src/media` - files/media.
- `backend/src/audit-logs` - audit records.
- `backend/src/mikey` - proactive/autonomous AI layer.
- `backend/src/realtime` - realtime gateway support.
- `backend/src/notifications` - notification delivery support.
- `backend/src/module-permissions`, `backend/src/auth`, `backend/src/users` - roles, login, permissions.

Existing dashboard pages that matter:

- `dashboard-v2/src/pages/BuilderDeskPage.tsx` - owner command center.
- `dashboard-v2/src/pages/LeadsPage.tsx` - lead list.
- `dashboard-v2/src/pages/CRMPage.tsx` and `PipelinePage.tsx` - CRM/pipeline surfaces.
- `dashboard-v2/src/pages/MessagesPage.tsx` - conversations/messages.
- `dashboard-v2/src/pages/CallsPage.tsx` - calls.
- `dashboard-v2/src/pages/ProjectsPage.tsx` - projects list.
- `dashboard-v2/src/pages/ProjectDetailPage.tsx` - project media, towers, unit import, availability grid, velocity.
- `dashboard-v2/src/pages/BookingPage.tsx` - bookings.
- `dashboard-v2/src/pages/PaymentSchedulesPage.tsx` - payment milestones.
- `dashboard-v2/src/pages/ChannelPartnersPage.tsx` - channel partners.
- `dashboard-v2/src/pages/ReportsPage.tsx`, `AnalyticsPage.tsx`, `FinanceReportsPage.tsx` - reporting surfaces.
- `dashboard-v2/src/pages/MikeyPage.tsx` - Mikey/Jarvis command center.
- `dashboard-v2/src/pages/SettingsPage.tsx`, `TeamPage.tsx`, `IntegrationsPage.tsx`, `WebhookPage.tsx` - setup/admin.

## What Is Already Built Enough To Reuse

### 1. CRM Foundation

Status: Exists.

Already there:

- Tenant model.
- User model and roles.
- Contact model.
- Lead model.
- Lead status and segment enums.
- Lead source enum with real estate portals.
- Campaigns, forms, QR codes, custom fields, tasks, notes, scoring, tickets, timeline.

Use these files:

- `backend/prisma/schema.prisma`
- `backend/src/leads/*`
- `backend/src/contacts/*`
- `backend/src/tasks/*`
- `backend/src/timeline/*`
- `dashboard-v2/src/pages/LeadsPage.tsx`
- `dashboard-v2/src/pages/CRMPage.tsx`
- `dashboard-v2/src/pages/PipelinePage.tsx`

What to build next:

- Make lead detail builder-specific: budget, project interest, preferred tower/unit, family notes, loan status, visit history, CP source, next action.
- Add a proper lead workbench pane with call, WhatsApp, visit booking, cost sheet, hold unit, and lost reason actions.
- Add duplicate merge UI with phone/email/project matching.
- Add SLA clock display on each lead.

### 2. Portal Lead Capture

Status: Partially built.

Already there:

- Webhook handlers for IndiaMART, 99acres, JustDial, MagicBricks, Housing.com, TradeIndia.
- Idempotency using webhook events.
- Contact dedupe and active lead reuse.
- Lead metadata captures portal source, city, budget, listing, property type.

Use these files:

- `backend/src/portal-integrations/portal-integrations.service.ts`
- `backend/src/portal-integrations/portal-integrations.controller.ts`
- `backend/src/webhooks/*`
- `dashboard-v2/src/pages/WebhookPage.tsx`

What to build next:

- Add portal connector health screen: last lead received, last success, last error, 7-day count, failed payload replay.
- After each portal lead, automatically create first-response actions: WhatsApp acknowledgement, call task, owner alert if unassigned after 10 minutes.
- Add source quality report: leads, contacted, visit booked, visit done, booking, spend, cost per booking.
- Add per-portal field mapping settings.

### 3. Conversations And WhatsApp

Status: Foundation exists, needs real builder workflow.

Already there:

- Conversation message model.
- Message channel enum: WhatsApp, email, SMS, chatbot, social DM, phone call, system, Telegram.
- Message templates module.
- Notifications and automation modules.

Use these files:

- `backend/src/conversations/*`
- `backend/src/message-templates/*`
- `backend/src/notifications/*`
- `dashboard-v2/src/pages/MessagesPage.tsx`
- `dashboard-v2/src/pages/TemplatesPage.tsx`

What to build next:

- Build true unified inbox: all messages for one buyer, with lead/project/unit context pinned beside it.
- Add WhatsApp template approval state, variables, send logs, delivery status, failure reason.
- Add builder templates: new lead reply, site visit confirmation, location pin, brochure, cost sheet, hold expiry, payment due, demand letter, possession update.
- Add one-click "ask Jarvis to reply" draft with human approval for outgoing customer messages.

### 4. Calls And IVR

Status: Foundation exists.

Already there:

- CallLog model.
- Call tracking module.
- Telephony module.
- Android device sync model.
- Recording URL, transcript, summary status fields.

Use these files:

- `backend/src/telephony/*`
- `backend/src/call-tracking/*`
- `mobile-android/*`
- `dashboard-v2/src/pages/CallsPage.tsx`

What to build next:

- Add missed-call to lead matching.
- Add call outcome form: connected, not reachable, wrong number, visit booked, not interested, follow-up date.
- Add IVR/call routing rules for sales team.
- Add call summary generation and lead timeline entry.
- Add "first response time" and "calls per lead" report.

### 5. Project, Tower, Unit Inventory

Status: Strong partial build.

Already there:

- `Project`, `Tower`, `Unit`, `UnitStatusHistory` models.
- Unit statuses: available, blocked, booked, sold, on hold.
- Project photos and brochure.
- Unit bulk import CSV.
- Visual availability grid.
- Inventory velocity report.
- Project detail page with tower/floor/unit grid.

Use these files:

- `backend/src/projects/projects.service.ts`
- `backend/src/projects/projects.controller.ts`
- `dashboard-v2/src/pages/ProjectsPage.tsx`
- `dashboard-v2/src/pages/ProjectDetailPage.tsx`

What to build next:

- Add real hold system with hold expiry, held by lead, held by user, approval status, auto-release job.
- Prevent two salespeople from holding or booking the same unit at the same time using database transactions.
- Add parking inventory, floor rise, PLC, facing, view premium, unit tags, RERA carpet/saleable area.
- Add price sheet versioning.
- Add inventory release control: hidden/internal/CP-visible/public-visible.
- Add unit detail drawer with full status history and linked buyer.

### 6. Site Visits

Status: Model exists, workflow incomplete.

Already there:

- `SiteVisit` model exists separately from `Booking`.
- Visit status enum exists: scheduled, confirmed, completed, no-show, rescheduled, cancelled.
- Booking lifecycle has reminders/post-visit follow-up logic.

Use these files:

- `backend/prisma/schema.prisma`
- `backend/src/bookings/*`
- `dashboard-v2/src/pages/BookingPage.tsx`
- New page needed: `dashboard-v2/src/pages/SiteVisitsPage.tsx`

What to build next:

- Create `backend/src/site-visits` module instead of forcing all visits through bookings.
- Add visit creation from lead detail.
- Add confirmation WhatsApp, location pin, assigned agent, transport note.
- Add check-in/check-out and outcome form.
- Add no-show recovery automation.
- Add visit calendar and daily visit board.

### 7. Bookings

Status: Basic booking exists, not builder-sale booking.

Already there:

- `Booking` model.
- Booking create/update/list.
- Payment link support.
- Unit can be blocked when a booking is created.

Use these files:

- `backend/src/bookings/bookings.service.ts`
- `backend/src/bookings/booking-lifecycle.service.ts`
- `dashboard-v2/src/pages/BookingPage.tsx`

What to build next:

- Separate site visit booking from flat/unit sale booking in UI and meaning.
- Add booking form: buyer, co-applicant, unit, booking amount, payment mode, cheque/UPI/ref, booking date, sales owner, CP, discount approval.
- Add booking lock: a unit cannot be booked unless available or validly held.
- Add booking cancellation/refund flow.
- Add booking transfer flow.
- Add booking agreement checklist.

### 8. Cost Sheets And Offers

Status: Missing.

Build this as a new module.

Create files:

- `backend/src/cost-sheets/cost-sheets.module.ts`
- `backend/src/cost-sheets/cost-sheets.controller.ts`
- `backend/src/cost-sheets/cost-sheets.service.ts`
- `backend/src/cost-sheets/cost-sheets.service.spec.ts`
- `dashboard-v2/src/pages/CostSheetsPage.tsx`
- `dashboard-v2/src/components/CostSheetDrawer.tsx`

Add Prisma models:

- `CostSheet`
- `CostSheetLineItem`
- `Offer`
- `OfferApproval`

What to build:

- Generate cost sheet from project/unit price.
- Include base price, floor rise, PLC, parking, clubhouse, legal, maintenance, corpus, GST, stamp duty, registration, discount, net payable.
- Save every version.
- Share PDF/HTML link on WhatsApp.
- Require approval for discounts above configured limit.
- Show accepted/rejected/expired offer state.

### 9. Payment Schedules, Demand Letters, Receipts

Status: Payment milestones exist; demand letters and receipts are missing.

Already there:

- `PaymentSchedule` model.
- Create/update/list/mark paid.
- Payment reminders through booking lifecycle.

Use these files:

- `backend/src/payment-schedules/payment-schedules.service.ts`
- `backend/src/payment-schedules/payment-schedules.controller.ts`
- `dashboard-v2/src/pages/PaymentSchedulesPage.tsx`

What to build next:

- Add payment plan templates: construction-linked, time-linked, subvention, custom.
- Generate milestones from booking.
- Add demand letter model and PDF/HTML generator.
- Add GST/TDS fields where needed.
- Add receipt model and receipt number sequence.
- Add overdue interest calculation.
- Add collection queue by buyer, project, due date, amount, owner.
- Add WhatsApp/email delivery tracking for demand letters.

### 10. KYC, Documents, Legal, E-Sign

Status: Mostly missing.

Build this as new modules or a document submodule.

Create files:

- `backend/src/documents/*`
- `backend/src/kyc/*`
- `dashboard-v2/src/pages/DocumentsPage.tsx`
- `dashboard-v2/src/components/KycChecklist.tsx`

Add Prisma models:

- `BuyerDocument`
- `KycVerification`
- `DocumentTemplate`
- `GeneratedDocument`
- `ESignRequest`

What to build:

- KYC checklist: PAN, Aadhaar offline XML/DigiLocker flow, address proof, photo, co-applicant docs, loan sanction letter.
- Do not store raw Aadhaar number unless legally approved; store verification status, masked ID, consent, timestamp, provider response reference.
- DigiLocker should be an official requester/partner integration, not a fake scrape.
- Aadhaar offline KYC should be consent-based upload/verification flow.
- Add document upload, review, reject reason, re-upload.
- Add agreement draft generation.
- Add e-sign provider integration.
- Add searchable file cabinet per buyer/booking/unit.

### 11. Customer Portal

Status: Missing as real buyer portal.

Create files:

- `backend/src/customer-portal/*`
- `dashboard-v2/src/pages/CustomerPortalPreviewPage.tsx`
- `dashboard-v2/src/pages/public/BuyerPortalPage.tsx`

What to build:

- Buyer login by OTP/magic link.
- Buyer can see booked unit, cost sheet, payment schedule, paid receipts, demand letters, documents, construction updates, tickets.
- Buyer can upload KYC docs.
- Buyer can raise service/customer-care tickets.
- Buyer can download statements.
- Buyer can see possession checklist.

### 12. Channel Partner OS

Status: Basic internal partner management exists.

Already there:

- `ChannelPartner` model.
- Create/list/update/delete.
- Allocate lead to partner.
- Basic performance and commission owed calculation.
- Channel partner page exists.

Use these files:

- `backend/src/channel-partners/channel-partners.service.ts`
- `backend/src/channel-partners/channel-partners.controller.ts`
- `dashboard-v2/src/pages/ChannelPartnersPage.tsx`

What to build next:

- Partner portal login.
- Partner lead registration form.
- Duplicate buyer lock.
- Lead acceptance/rejection by internal team.
- Partner inventory visibility controls.
- Partner collateral/download center.
- Partner visit booking request.
- Commission ledger: payable, approved, paid, held, dispute.
- Partner performance dashboard.

### 13. Marketing, Campaigns, Attribution

Status: Foundation exists.

Already there:

- Campaign model.
- Ad integrations module.
- Forms and QR codes.
- Analytics/reporting modules.

Use these files:

- `backend/src/campaigns/*`
- `backend/src/ad-integrations/*`
- `backend/src/forms/*`
- `backend/src/qr-codes/*`
- `backend/src/analytics/*`
- `dashboard-v2/src/pages/CampaignsPage.tsx`
- `dashboard-v2/src/pages/AdIntegrationsPage.tsx`
- `dashboard-v2/src/pages/AnalyticsPage.tsx`

What to build next:

- Real estate campaign presets: launch, price change, inventory release, channel partner activation, site visit weekend.
- UTM/source attribution from lead to booking.
- Source quality dashboard: spend, leads, visits, bookings, revenue.
- Campaign ROI and recommendation engine.
- Bulk WhatsApp/email with compliance and opt-out rules.

### 14. Reports And Owner Desk

Status: Good partial build.

Already there:

- Builder Desk page exists.
- Builder command API planned/partly wired.
- Reports/analytics pages exist.

Use these files:

- `backend/src/analytics/analytics.service.ts`
- `backend/src/analytics/analytics.controller.ts`
- `dashboard-v2/src/pages/BuilderDeskPage.tsx`
- `dashboard-v2/src/pages/ReportsPage.tsx`

What to build next:

- Make Builder Desk the default real estate home page.
- Add drilldowns for every KPI.
- Add owner daily summary: leads ignored, visits today, holds expiring, overdue payments, top source, weak salespeople, Jarvis actions.
- Add saved reports and scheduled WhatsApp/email owner reports.

### 15. Jarvis / Mikey Proactive Agent

Status: Strong foundation, not yet builder-specific enough.

Already there:

- Mikey command center.
- Action risk rules.
- Autonomous action logs.
- Memory, procedural rules, reflexion logs.
- Outcome engine.
- Proactive suggestion path.
- Agent service with LangGraph/FastAPI.
- Guardrails for high-risk actions.

Use these files:

- `backend/src/mikey/*`
- `agent-service/app/*`
- `dashboard-v2/src/pages/MikeyPage.tsx`
- `JARVIS_PLAN.md`

What to build next:

- Rename or position Mikey as Jarvis for builder OS, or keep Mikey internally and expose "Jarvis" in UI.
- Add builder-specific scans:
  - new lead not called within SLA
  - hot lead not followed up
  - site visit not confirmed
  - no-show recovery needed
  - unit hold expiring
  - payment overdue
  - demand letter failed
  - portal webhook failing
  - salesperson not logging outcomes
  - source quality drop
  - channel partner duplicate attempts
- Add builder-specific tools:
  - create_site_visit
  - confirm_site_visit
  - hold_unit
  - release_hold
  - generate_cost_sheet
  - request_discount_approval
  - create_demand_letter
  - send_payment_reminder
  - create_customer_ticket
  - create_partner_lead_registration
- Add authority levels:
  - Level 0: read and report.
  - Level 1: draft only.
  - Level 2: create internal tasks.
  - Level 3: send approved templates.
  - Level 4: perform reversible actions.
  - Level 5: high-risk actions require human approval.
- Add verification after every action: check database state, check message delivery, check audit log, create failure ticket if action failed.

### 16. Testing And Production Reliability

Status: Some tests exist; full live E2E testing is missing.

Already there:

- Backend Jest tests.
- Dashboard Vitest tests.
- Agent service tests.
- Playwright E2E folder.
- Production readiness/checklist docs.

Use these files:

- `backend/src/**/*.spec.ts`
- `dashboard-v2/src/test/**/*`
- `agent-service/tests/*`
- `e2e/*`
- `docs/PRODUCTION_CHECKLIST.md`
- `docs/PRODUCTION_READINESS_AUDIT.md`

What to build next:

- Add real estate E2E suite:
  - portal lead enters
  - lead assigned
  - WhatsApp draft/send logged
  - site visit created
  - visit completed
  - unit held
  - cost sheet generated
  - booking created
  - payment schedule generated
  - demand letter sent
  - receipt marked paid
  - customer portal shows everything
  - Jarvis detects any failure
- Add synthetic production tenant that runs hourly without touching real buyers.
- Add shadow-mode Jarvis tests before allowing automation.
- Add failure drills for WhatsApp down, payment provider down, portal webhook malformed, duplicate unit booking, expired hold, DB transaction failure.
- Add monitoring alerts for every integration.

## Biggest Gaps To Build First

Build in this order.

### Phase 1: Make Lead-To-Visit End-To-End

Goal: A portal lead should become a contacted, assigned, visit-ready buyer without manual tab switching.

Build:

- Portal connector health.
- Lead detail builder workbench.
- SLA clock.
- WhatsApp first-response automation.
- Call outcome logging.
- Site visit module/page.
- Post-visit outcome and next action.
- Tests for the full flow.

Main files:

- `backend/src/portal-integrations/*`
- `backend/src/leads/*`
- `backend/src/conversations/*`
- `backend/src/telephony/*`
- `backend/src/site-visits/*` new
- `dashboard-v2/src/pages/LeadsPage.tsx`
- `dashboard-v2/src/pages/SiteVisitsPage.tsx` new
- `dashboard-v2/src/pages/BuilderDeskPage.tsx`

### Phase 2: Make Inventory-To-Booking Real

Goal: A salesperson can show availability, hold a unit, generate cost sheet, get approval, and book safely.

Build:

- Transaction-safe unit holds.
- Hold expiry worker.
- Cost sheet module.
- Offer/discount approvals.
- Booking form linked to unit/lead/cost sheet.
- Inventory status history and audit log.
- Tests for duplicate hold/booking prevention.

Main files:

- `backend/src/projects/*`
- `backend/src/cost-sheets/*` new
- `backend/src/bookings/*`
- `dashboard-v2/src/pages/ProjectDetailPage.tsx`
- `dashboard-v2/src/pages/CostSheetsPage.tsx` new
- `dashboard-v2/src/pages/BookingPage.tsx`

### Phase 3: Make Post-Sales Real

Goal: After booking, the builder can collect money, issue demand letters/receipts, manage documents, and keep buyer informed.

Build:

- Payment plan templates.
- Demand letters.
- Receipts.
- Ledger/account statement.
- KYC/document checklist.
- Agreement/e-sign workflow.
- Buyer portal.
- Customer-care tickets.

Main files:

- `backend/src/payment-schedules/*`
- `backend/src/documents/*` new
- `backend/src/kyc/*` new
- `backend/src/customer-portal/*` new
- `dashboard-v2/src/pages/PaymentSchedulesPage.tsx`
- `dashboard-v2/src/pages/DocumentsPage.tsx` new
- `dashboard-v2/src/pages/public/BuyerPortalPage.tsx` new

### Phase 4: Make Channel Partners A Revenue Engine

Goal: Partners can register buyers, avoid duplicates, see allowed inventory, book visits, and track commissions.

Build:

- Partner portal login.
- Partner lead registration.
- Duplicate lock.
- Inventory visibility rules.
- Commission ledger.
- Partner performance dashboard.

Main files:

- `backend/src/channel-partners/*`
- `backend/src/projects/*`
- `dashboard-v2/src/pages/ChannelPartnersPage.tsx`
- `dashboard-v2/src/pages/public/PartnerPortalPage.tsx` new

### Phase 5: Make Jarvis The Operating Manager

Goal: The system should not wait for humans to remember everything. Jarvis should watch, decide, act safely, verify, and explain.

Build:

- Builder-specific Jarvis scans.
- Builder-specific Jarvis tools.
- Approval queue.
- Live action verification.
- Synthetic production tests.
- Failure ticket creation.
- Owner daily brief.

Main files:

- `backend/src/mikey/*`
- `agent-service/app/*`
- `dashboard-v2/src/pages/MikeyPage.tsx`
- `dashboard-v2/src/pages/BuilderDeskPage.tsx`
- `backend/src/audit-logs/*`
- `backend/src/failures/*`

## Definition Of Done For Each Feature

A feature is not done when the screen exists. It is done only when all of this is true:

- Database model/migration exists if data must persist.
- API validates input and returns useful errors.
- UI has loading, empty, success, and error states.
- Action writes audit/timeline entry.
- Important actions are idempotent.
- Background job failures are visible.
- Jarvis can see the state.
- Tests cover happy path, duplicate path, permission failure, integration failure.
- Playwright covers the main user journey.
- Production monitoring can detect failure.

## Simple Product Truth

What we have now:

- A strong CRM/automation foundation with real estate modules started.
- Good project/unit inventory base.
- Good portal intake base.
- Good Mikey/Jarvis foundation.
- Enough to become a serious small-builder OS.

What we still need:

- The deep builder workflow after lead capture.
- Proper hold/cost sheet/booking/payment/legal/customer portal flow.
- Partner portal.
- Real production-grade testing.
- Jarvis tools that can operate the builder workflow, not just talk about it.

Final target:

The builder opens one screen in the morning and sees exactly what matters: leads leaking, visits today, units moving, payments stuck, partners performing, documents pending, and what Jarvis already handled.

