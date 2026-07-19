# Build Brief For DeepSeek: 14 Modules For The Real Estate Builder OS

Date: 2026-07-18
Audience: an AI coding agent (DeepSeek) with **no memory of any prior conversation about this project**. Read this whole file before writing any code. Do not skip to a section and start coding — the conventions section is not optional context, it is the spec.

## 0. What this project is

This repo is a real-estate CRM/"builder OS" for small Indian property developers, built on top of an existing multi-purpose CRM. Two documents already define the full product vision:

- `docs/sell-do-small-builder-checklist.md` — the full product spec (2,786 lines). Sections 61-72 describe the P2/P3 expansion this brief pulls from.
- `docs/real-estate-current-vs-build-map.md` — a gap map of what already exists in this codebase vs what's missing.

**Read both files in full before starting.** This brief tells you exactly which 14 items are yours to build and gives you the precision to build them without guessing, but the two docs above are the source of truth for tone, positioning, and any nuance not repeated here.

Another engineer (not you) is building a different 22 items from the same gap list in parallel — things like the agreement-to-possession lifecycle, real e-sign provider integration, and channel-partner workflows, all of which extend models that already exist. **Your 14 items are deliberately the ones with the least overlap with that work** — mostly new, additive modules. Do not edit any file you did not create yourself unless this brief explicitly tells you to add a relation to an existing Prisma model (listed per-item below). If you think you need to touch a file outside what's listed, stop and flag it instead of guessing.

## 1. Tech stack (do not deviate)

- **Backend:** NestJS (TypeScript) in `backend/src`. Each feature is its own module folder: `module-name/module-name.module.ts`, `.controller.ts`, `.service.ts`, `dto/*.dto.ts`, `.service.spec.ts`.
- **Database:** PostgreSQL via Prisma. Schema lives in one file: `backend/prisma/schema.prisma`. Migrations live in `backend/prisma/migrations/<timestamp>_<name>/migration.sql`.
- **Frontend:** React 19 + Vite + TypeScript in `dashboard-v2/src`. Pages live in `dashboard-v2/src/pages/<PageName>.tsx`, registered in `dashboard-v2/src/App.tsx` (lazy import + route map) and `dashboard-v2/src/components/layout/sidebar.tsx` (nav entry).
- **Auth:** `JwtAuthGuard` + `RolesGuard` + `@Roles('OWNER', 'ADMIN', ...)` decorator on every controller, `@ApiBearerAuth()` for Swagger. Roles available: `OWNER`, `ADMIN`, `MANAGER`, `SALES_AGENT`, `SUPPORT_AGENT`, `VIEWER`.
- **Testing:** Jest. Every service needs a `.service.spec.ts` covering its real invariants (not just happy path) — see the examples pattern in section 3.

## 2. Non-negotiable conventions

These are not style preferences. Code that violates them will be rejected.

1. **Every new Prisma model is tenant-scoped.** Add `tenantId String @map("tenant_id")` plus `tenant Tenant @relation(fields: [tenantId], references: [id])`, and add the reciprocal relation array on the `Tenant` model. Every query filters by `tenantId` taken from `req.user.tenantId` in the controller — never from a body/query param the browser could spoof.
2. **Money is stored in paise as `BigInt`, never `Float`.** Field name suffix `Paise`, e.g. `amountPaise BigInt`. When returning BigInt fields from a service to JSON, convert with `.toString()` (BigInt doesn't serialize natively) — see the `serializable()` helper pattern already used in `backend/src/collections/collections.service.ts` and copy it.
3. **Every mutating action writes a timeline entry and an audit log.** Inject `TimelineService` (`backend/src/timeline/timeline.service.ts`, method `.add({...})`) and `AuditLogsService` (`backend/src/audit-logs/audit-logs.service.ts`, method `.log(action, entity, entityId, actorId, details)`). Both are `@Global()` modules — just inject them in your constructor, no module import needed.
4. **Status transitions are always guarded.** Before changing a record's status, check its current status is in an allowed list; throw `ForbiddenException` if not. Look at `backend/src/site-visits/site-visits.service.ts` or `backend/src/cost-sheets/cost-sheets.service.ts` for the exact pattern (a private `requireStatus`/`require` helper).
5. **Never invent tax, legal, interest, or provider-specific values.** If a feature needs a real GST rate, stamp-duty percentage, or a live third-party API key/account, do not hardcode a plausible-looking number or fake a successful integration. Build the configuration surface (a tenant-editable field/template) and leave the actual value for the builder/accountant to fill in. Where a genuine external account is required (e.g. a live payment gateway, a real SMS/WhatsApp provider) and none is configured, the feature should clearly state "not configured" rather than pretend to succeed.
6. **Migrations: one per logical batch, applied and verified.** After editing `schema.prisma`, run (from `backend/`):
   ```
   npx prisma validate
   npx prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel prisma/schema.prisma --script > /tmp/migration.sql
   ```
   then create `prisma/migrations/<UTC-timestamp>_<snake_case_name>/migration.sql` with that output, and run `npx prisma migrate deploy && npx prisma generate`. Never hand-edit a migration that's already been applied.
7. **Type-check before calling anything done.** `cd backend && npx tsc --noEmit -p tsconfig.json` and `cd dashboard-v2 && npx tsc --noEmit -p tsconfig.json` must both be clean.
8. **Every list page needs**: search/filter bar, loading skeleton, empty state, error+retry state, and pagination if the list can grow unbounded. Copy the pattern from `dashboard-v2/src/pages/SiteVisitsPage.tsx` or `CollectionsPage.tsx` — table with `TableHeader`/`TableBody`/`TableRow`/`TableCell` from `../components/ui/table`, `Badge` from `../components/ui/badge`, toast via `react-hot-toast`.
9. **API calls from the frontend** go through `api()` from `../lib/api` (handles auth token + base URL), e.g. `api('/path', { method: 'POST', body: JSON.stringify(data) })`.

## 3. Example of the precision expected (already-built reference)

Look at these four files in the repo before starting — they are the actual standard your 14 modules will be judged against:

- `backend/src/site-visits/site-visits.service.ts` + `.controller.ts` + `.module.ts` + `.service.spec.ts` — a complete, small module.
- `backend/src/collections/collections.service.ts` — shows the BigInt/paise serialization pattern and an append-only ledger.
- `dashboard-v2/src/pages/CollectionsPage.tsx` — a complete list-plus-detail-plus-modal frontend page.
- `backend/prisma/schema.prisma` — search for `model SiteVisit` to see the comment style and field conventions expected on every new model (a `///` doc-comment above the model explaining *why* it exists, not just what fields it has).

## 4. Your 14 modules

Build them in this order — each is a standalone vertical slice (model → migration → service → controller → tests → page → nav registration). Do not move to the next until the current one type-checks, has passing tests, and its migration is applied.

---

### 4.1 Marketing Journey Builder

**Purpose:** lets the builder configure automated multi-step nurture campaigns (drip sequences) beyond the one-off bulk-send already in `campaigns` module.

**New Prisma models:**
- `MarketingJourney`: id, tenantId, name, status (`DRAFT`/`ACTIVE`/`PAUSED`/`ARCHIVED`), entryEventType (String — e.g. `lead.created`, `site_visit.no_show`), entryConditions (Json), version (Int @default(1)), createdAt, updatedAt.
- `MarketingJourneyStep`: id, journeyId (FK to MarketingJourney, cascade delete), order (Int), stepType (`WAIT`/`SEND_TEMPLATE`/`CREATE_TASK`/`WEBHOOK`/`EXIT_CONDITION`), config (Json — e.g. `{ waitHours: 24 }` or `{ templateId: "..." }`), createdAt.
- `MarketingJourneyEnrollment`: id, tenantId, journeyId, leadId, currentStepOrder (Int), status (`ACTIVE`/`COMPLETED`/`EXITED`), enrolledAt, completedAt.

**Service requirements:**
- `createJourney`, `addStep`, `activateJourney` (only from DRAFT), `pauseJourney`.
- `enrollLead(journeyId, leadId)` — creates an enrollment only if the lead isn't already actively enrolled in this journey (no duplicate enrollment).
- A `previewAudience(journeyId)` method that returns a **count and a sample of up to 10 leads** matching `entryConditions` — never activate a journey without the dry-run count being visible first (the UI must show this before the "Activate" button is enabled).
- Processing steps (advancing an enrollment through WAIT/SEND_TEMPLATE/etc.) can be a stub method `processEnrollments()` that's safe to call repeatedly (idempotent) — actually wiring it into a scheduler is optional for this pass, but the method must exist and be tested.
- Changing an active journey's steps must not retroactively change history for people already enrolled under the old version — bump `version` and snapshot the step config an enrollment is following (store `journeySnapshot: Json` on `MarketingJourneyEnrollment` at enrollment time).

**Endpoints:** `POST /marketing-journeys`, `GET /marketing-journeys`, `GET /marketing-journeys/:id`, `POST /marketing-journeys/:id/steps`, `POST /marketing-journeys/:id/activate`, `POST /marketing-journeys/:id/pause`, `GET /marketing-journeys/:id/preview-audience`, `POST /marketing-journeys/:id/enroll` (body: `leadId`).

**Roles:** OWNER/ADMIN can create/activate; MANAGER/SALES_AGENT can view and manually enroll a lead.

**Frontend:** `MarketingJourneysPage.tsx` — list of journeys with status badges, a create-journey modal (name + entry event dropdown), a step-builder view (ordered list of steps, add-step button with type selector), and a dry-run audience count shown before allowing Activate.

**Tests:** duplicate-enrollment prevention, activate-blocked-without-preview (if you gate it server-side), version-snapshot-on-enrollment.

---

### 4.2 Events / Launches Module

**Purpose:** open houses, broker meets, project launches, webinars, site-visit drives — each with RSVP and QR check-in, distinct from the generic `Event` model that may already exist for internal calendar bookings (check `schema.prisma` for an existing `Event` model first; if one exists and is unrelated to marketing events, do not reuse it — create a new model with a different name, e.g. `MarketingEvent`, to avoid collision).

**New Prisma models:**
- `MarketingEvent`: id, tenantId, projectId (optional FK to Project), name, eventType (`OPEN_HOUSE`/`BROKER_MEET`/`LAUNCH`/`WEBINAR`/`SITE_VISIT_DRIVE`), startAt, endAt, location, description, capacity (Int, optional), status (`DRAFT`/`PUBLISHED`/`COMPLETED`/`CANCELLED`), createdById, createdAt.
- `MarketingEventInvitee`: id, eventId (FK, cascade), leadId (optional FK to Lead), channelPartnerId (optional FK to ChannelPartner), name, phone, email, rsvpStatus (`INVITED`/`CONFIRMED`/`DECLINED`/`ATTENDED`/`NO_SHOW`), qrCheckInToken (String, unique, nullable), checkedInAt (DateTime, nullable), createdAt.

**Service requirements:**
- `createEvent`, `inviteLeads(eventId, leadIds[])` (creates invitee rows, skips duplicates for the same lead+event), `recordRsvp(inviteeId, status)`.
- `generateCheckInToken(inviteeId)` — a short random token (crypto.randomBytes) stored on the invitee row, used for QR check-in.
- `checkIn(qrCheckInToken)` — looks up the invitee by token, sets `checkedInAt` and `rsvpStatus = ATTENDED`; must be idempotent (checking in twice doesn't error, just no-ops on the second call).
- `getEventReport(eventId)` — invited count, confirmed count, attended count, no-show count, and (if invitees have `leadId`) how many of them later reached `CONVERTED` lead status — this is the "conversion report" the spec asks for.
- Every invitee that has a `leadId` should get a timeline entry (`TimelineService.add`) when invited and when checked in, so event attendance survives forever in that lead's history (spec: "A lead entering from an event retains the event attribution forever" — store `metadata: { marketingEventId }` on the timeline entry, and also stamp it into the Lead's own `metadata` JSON field if you have write access to update Lead — check with a `prisma.lead.update` merging into existing metadata, don't overwrite the whole field).

**Endpoints:** `POST /marketing-events`, `GET /marketing-events`, `GET /marketing-events/:id`, `POST /marketing-events/:id/invite`, `POST /marketing-events/:id/invitees/:inviteeId/rsvp`, `GET /marketing-events/check-in/:token` (public, no auth — this is what a QR code scan hits), `GET /marketing-events/:id/report`.

**Roles:** OWNER/ADMIN/MANAGER manage events; the check-in endpoint must be `@Public()` (decorator from `backend/src/auth/public.decorator.ts`) since it's scanned by anyone at the venue, but it only ever exposes/mutates one invitee record by unguessable token — never list other invitees.

**Frontend:** `MarketingEventsPage.tsx` — event list, create modal, invitee list per event with RSVP status badges and a "generate QR" button per invitee (render the check-in URL as a QR code — use a lightweight QR library already in `package.json` if one exists, otherwise just show the raw URL/token, don't add a new heavy dependency without checking first).

**Tests:** duplicate-invite prevention, idempotent check-in, report counts, timeline entry created on invite/check-in.

---

### 4.3 Portfolio Dashboard (multi-entity)

**Purpose:** for a builder running multiple projects/cities, a single aggregate view across all of them — a read-only reporting layer, no new business-state models.

**No new Prisma models needed.** This is pure aggregation over existing data: `Project`, `Unit`, `Booking`, `PaymentSchedule`/`PaymentReceipt`/`LedgerEntry`, `SiteVisit`, `Lead`.

**Service requirements:** a `PortfolioService.getOverview(tenantId)` returning, grouped by project:
- units available/on-hold/booked/sold counts,
- bookings this month and total,
- collections this month (sum of confirmed `PaymentReceipt.amountPaise` where `receivedAt` in current month) and overdue amount (sum of `PaymentSchedule` where status OVERDUE — note this is a Float field on the legacy model, so keep this specific calculation in rupees/Float to match, don't try to convert it to paise),
- site visits this month and conversion rate (visits with outcome leading to a booking / total completed visits),
- lead volume this month.
Also a `getOverview` variant scoped by city/location (`Project.location` field) for a city roll-up.

**Endpoints:** `GET /portfolio/overview`, `GET /portfolio/overview/by-city`.

**Roles:** OWNER/ADMIN only (cross-project financial visibility).

**Frontend:** `PortfolioPage.tsx` — one card per project showing the metrics above, plus a top-level summary row totaling across all projects. No forms, no mutations — read-only.

**Tests:** correct aggregation math with a small fixture of 2-3 projects and mixed unit/booking/payment states.

---

### 4.4 Project Cash-Flow Forecasting

**Purpose:** projected vs actual cash position per project — bookings expected to convert to collections, minus known outgoing (commission, refunds).

**New Prisma model:**
- `CashFlowForecastEntry`: id, tenantId, projectId, entryType (`EXPECTED_COLLECTION`/`EXPECTED_COMMISSION_PAYOUT`/`EXPECTED_REFUND`/`PLANNED_EXPENSE`), amountPaise (BigInt), expectedDate (DateTime), sourceType (String — e.g. `PaymentSchedule`, `CommissionAccrual`, manual), sourceId (String, optional — id of the originating record if auto-derived), notes (String, optional), createdById, createdAt.

**Service requirements:**
- `generateFromExisting(projectId)` — scans `PaymentSchedule` rows (status PENDING, with a `dueDate`) for that project's bookings and creates `EXPECTED_COLLECTION` entries (idempotent: don't duplicate if an entry already exists with the same `sourceType`+`sourceId`), and scans pending `CommissionAccrual` for `EXPECTED_COMMISSION_PAYOUT`.
- `addManualEntry(...)` for planned expenses not derivable from existing data (e.g. marketing spend, construction cost) — this is deliberately manual input, do not invent a formula for construction costs.
- `getForecast(projectId, monthsAhead)` — returns a month-by-month projected net cash figure. **Label it clearly as a forecast, not a guarantee** — spec explicitly requires: "label forecasts clearly and reconcile with approved finance system rather than replacing accounting."

**Endpoints:** `POST /projects/:projectId/cash-flow/generate`, `POST /projects/:projectId/cash-flow/entries` (manual), `GET /projects/:projectId/cash-flow/forecast?monthsAhead=6`.

**Roles:** OWNER/ADMIN only.

**Frontend:** `CashFlowForecastPage.tsx` (or a tab inside an existing project detail page if one exists — check `ProjectDetailPage.tsx` first) — a simple month-by-month bar/line view (reuse whatever charting library is already a dependency; do not add a new one) with a clear "Forecast — not actual accounting" label.

**Tests:** idempotent generation (running `generateFromExisting` twice doesn't double-count), correct month bucketing.

---

### 4.5 Landowner / Co-Promoter Revenue-Share Allocation

**Purpose:** in joint-development deals, a landowner or co-promoter is entitled to a share of specific units or booking revenue — track this separately from normal sales.

**New Prisma models:**
- `RevenueShareParty`: id, tenantId, projectId, partyName, partyType (`LANDOWNER`/`CO_PROMOTER`), sharePercent (Float, 0-100), contactEmail (optional), contactPhone (optional), createdAt.
- `RevenueShareAllocation`: id, tenantId, partyId (FK to RevenueShareParty), unitId (optional FK to Unit — for a unit-based share) OR bookingId (optional FK to Booking — for a revenue-based share; at least one of unitId/bookingId must be set, validate this in the service), allocatedAmountPaise (BigInt, optional — computed at booking time), status (`PENDING`/`CONFIRMED`/`SETTLED`), createdAt.

**Service requirements:**
- `addParty`, `allocateUnit(partyId, unitId)` for a landowner's specific unit allocation.
- `computeShareOnBooking(bookingId)` — when a unit tied to a `RevenueShareAllocation` gets booked, compute `allocatedAmountPaise = booking.bookingAmountPaise * sharePercent / 100` and create/update the allocation row to CONFIRMED. This should be callable manually via an endpoint (do not auto-hook it into the existing booking-confirmation flow — that code belongs to the other engineer's portion; keep this as an explicit action a staff member triggers after a booking is confirmed, to avoid touching `booking-confirmation.service.ts`).
- `markSettled(allocationId)`.

**Endpoints:** `POST /revenue-share/parties`, `GET /revenue-share/parties?projectId=`, `POST /revenue-share/parties/:id/allocate-unit`, `POST /revenue-share/allocations/:bookingId/compute` (body: bookingId), `POST /revenue-share/allocations/:id/settle`.

**Roles:** OWNER/ADMIN only.

**Frontend:** `RevenueSharePage.tsx` — party list per project, allocation list with status badges, a "compute share" action per confirmed booking.

**Tests:** percentage math correctness, validation that at least one of unitId/bookingId is set, settle-twice guard.

---

### 4.6 Resale / Rental Listing Inventory

**Purpose:** distinct from new-developer `Unit` inventory — secondary-market resale listings and rental listings a builder/broker also handles. Reuses the existing `Property` model's *shape* conceptually (broker-style standalone listings) but must be its own model since `Property` may already be scoped to a different purpose — check `schema.prisma` for `model Property` and read its comment before deciding; if it is already exactly this concept, extend it with an additive field instead of duplicating. If it's for something else (e.g. non-real-estate listings), create a new model.

**New Prisma model (assuming a new model is needed):**
- `ResaleListing`: id, tenantId, listingType (`RESALE`/`RENTAL`), unitId (optional FK to Unit, if it's a resale of an already-tracked unit), externalOwnerName (String, optional — if the seller isn't a tracked buyer), askingPriceRupees (Float — keep consistent with existing `Property.price`/`Unit.price` which are Float, do not introduce a paise field here to avoid a mixed-precision listing), rentAmountRupees (Float, optional, for rentals), location, bedrooms (Int, optional), areaSqft (Float, optional), status (`AVAILABLE`/`UNDER_NEGOTIATION`/`CLOSED`), images (Json, default `[]`), createdById, createdAt, updatedAt.

**Service requirements:** standard CRUD, filterable by listingType/status/location/priceRange, and a `closeListing(id, reason)`.

**Endpoints:** `POST /resale-listings`, `GET /resale-listings`, `GET /resale-listings/:id`, `PATCH /resale-listings/:id`, `POST /resale-listings/:id/close`.

**Roles:** OWNER/ADMIN/MANAGER manage; SALES_AGENT/VIEWER can view.

**Frontend:** `ResaleListingsPage.tsx` — filterable grid, create/edit form, status badges.

**Tests:** filter correctness, close-twice guard.

---

### 4.7 Referral / Loyalty Program

**Purpose:** existing buyers referring new leads, with a reward that requires approval (never auto-paid) and basic fraud checks (a referrer can't refer themselves, a phone number can't be referred by two different people simultaneously in a way that pays out twice).

**New Prisma models:**
- `ReferralProgram`: id, tenantId, name, rewardType (`FLAT`/`PERCENT_OF_BOOKING`), rewardAmountPaise (BigInt, optional), rewardPercent (Float, optional), active (Boolean, default true), createdAt.
- `Referral`: id, tenantId, programId (FK), referrerContactId (FK to Contact — the existing buyer who referred), referredLeadId (optional FK to Lead, set once the referred person becomes a lead), referredPhone (String — normalized, captured at referral time even before a lead exists), status (`SUBMITTED`/`LEAD_CREATED`/`BOOKED`/`REWARD_APPROVED`/`REWARD_PAID`/`REJECTED`), rewardAmountPaise (BigInt, optional — computed when a booking happens), createdAt.

**Service requirements:**
- `submitReferral(programId, referrerContactId, referredPhone)` — reject if `referredPhone` normalizes to the same number as the referrer's own contact phone (self-referral fraud check), reject if an active (non-REJECTED) referral for this phone+program already exists from a **different** referrer (first-referrer-wins, mirroring the channel-partner dedupe pattern — if you want to look at that pattern for reference, read `backend/src/channel-partner-claims/channel-partner-claims.service.ts`, but do not import from it or modify it).
- `linkToLead(referralId, leadId)` — called once the referred phone becomes an actual Lead (manual staff action for this pass, not auto-wired into lead ingestion since that touches code outside your scope).
- `computeRewardOnBooking(referralId, bookingAmountPaise)` — sets status BOOKED and computes `rewardAmountPaise`. Reward is never auto-approved: a separate `approveReward(referralId, approverId)` (OWNER/ADMIN only) moves it to REWARD_APPROVED, and `markPaid(referralId)` moves it to REWARD_PAID.

**Endpoints:** `POST /referrals/programs`, `GET /referrals/programs`, `POST /referrals`, `POST /referrals/:id/link-lead`, `POST /referrals/:id/compute-reward`, `POST /referrals/:id/approve-reward`, `POST /referrals/:id/mark-paid`, `GET /referrals?referrerContactId=`.

**Roles:** SALES_AGENT/MANAGER can submit/link; OWNER/ADMIN approve/pay.

**Frontend:** `ReferralsPage.tsx` — program list, referral list with status pipeline, approve/pay actions gated to OWNER/ADMIN in the UI too (hide the buttons for other roles, though the real enforcement is server-side).

**Tests:** self-referral rejection, duplicate-referral-different-referrer rejection, reward computation math, can't approve twice.

---

### 4.8 NRI / International Buyer Workflow

**Purpose:** buyers based overseas need timezone-aware scheduling, different document types (passport/overseas address proof instead of local ID in some flows), and a flag so staff know to route them differently. This is mostly a configuration/tagging layer, not a new business process.

**New Prisma model:**
- `NriBuyerProfile`: id, tenantId, leadId (FK to Lead, unique — one profile per lead), countryOfResidence (String), timezone (String, e.g. `America/New_York`), preferredContactHoursLocal (String, optional, e.g. `"18:00-21:00"`), passportNumberMasked (String, optional — store only masked, same rule as PAN elsewhere in this codebase: never the raw number), overseasAddress (Json, optional), remotePaymentMethodNote (String, optional — free text, since actual authorised payment rails are a legal/banking decision outside this codebase's scope), createdAt, updatedAt.

**Service requirements:**
- `createOrUpdateProfile(leadId, data)`.
- `getLocalTime(leadId)` — given the profile's timezone, return the current local time for that buyer (useful for a "safe to call now" indicator; use a timezone library already in `package.json`, e.g. check if `date-fns-tz` or similar exists before adding a new dependency).
- `isWithinPreferredHours(leadId)` — parses `preferredContactHoursLocal` and returns a boolean for right-now.

**Endpoints:** `POST /nri-profiles`, `GET /nri-profiles/:leadId`, `PATCH /nri-profiles/:leadId`.

**Roles:** OWNER/ADMIN/MANAGER/SALES_AGENT can view/edit (this is operational data, not restricted).

**Frontend:** a section/tab addable to wherever lead detail already renders (check `dashboard-v2/src/pages/LeadsPage.tsx` for the existing expanded-row workbench pattern — **do not edit that file**, since it's actively being extended by the other engineer; instead build a standalone `NriProfilePage.tsx` that takes a `leadId` and can be linked to from a URL, e.g. `#/nri-profile/:leadId`, so it doesn't need to touch the existing lead detail view this pass).

**Tests:** timezone math correctness, preferred-hours parsing edge cases (crossing midnight, e.g. `"22:00-02:00"`).

---

### 4.9 Vendor / Construction ERP Integration (stub adapter)

**Purpose:** a real construction-progress ERP integration requires a specific vendor's real API, which we don't have. Build the **adapter interface and a manual-entry fallback**, not a fake live integration.

**New Prisma models:**
- `ConstructionErpConnection`: id, tenantId, projectId, provider (String, e.g. `"manual"`, `"procore"`, `"buildertrend"` — free text since we don't know which the tenant uses), status (`NOT_CONFIGURED`/`CONNECTED`/`ERROR`), lastSyncAt (DateTime, optional), config (Json, default `{}` — placeholder for future real credentials, do not populate with fake ones), createdAt.
- `ConstructionMilestoneUpdate`: id, tenantId, projectId, towerId (optional FK to Tower), milestoneName (String, e.g. `"Foundation complete"`), percentComplete (Int, 0-100), sourceType (`MANUAL`/`ERP_SYNC`), reportedById (optional — staff user if manual), reportedAt (DateTime), createdAt.

**Service requirements:**
- `recordManualUpdate(projectId, milestoneName, percentComplete, reportedById)` — this is the real, working path for this pass.
- `getConnection(projectId)` / `configureConnection(projectId, provider)` — sets status to `NOT_CONFIGURED` by default; **do not implement a fake sync that pretends to pull real data**. If no real ERP credentials exist (they don't, in this codebase), a `syncFromErp(projectId)` method should throw a clear `BadRequestException('No ERP connection configured — use manual updates')` rather than fabricate progress data.
- `getMilestoneHistory(projectId)` — chronological list, which is what actually feeds the "construction update feed" the other engineer's portion will surface to buyers (your job is just to produce and store this data reliably; the buyer-facing display of it belongs to their portion — do not build a buyer-facing page for this, just the internal recording UI and API).

**Endpoints:** `POST /construction-updates` (manual entry), `GET /construction-updates?projectId=`, `GET /construction-erp-connections/:projectId`, `POST /construction-erp-connections/:projectId/configure`.

**Roles:** OWNER/ADMIN/MANAGER can record updates.

**Frontend:** `ConstructionUpdatesPage.tsx` — per-project timeline of milestone updates, a simple form to add one manually, and a "ERP integration: not configured" state shown honestly rather than a fake "connected" indicator.

**Tests:** `syncFromErp` throws when unconfigured, manual update history ordering.

---

### 4.10 Searchable Permission-Aware File Cabinet

**Purpose:** a unified search across all documents already stored elsewhere in the system (media files, generated documents, buyer documents) — this is a read-layer, not a new storage system.

**No new Prisma models needed for storage** — it queries existing `MediaFile`, `GeneratedDocument`, `BuyerDocument` models (all already exist by the time you build this). If you need a lightweight index table for performance, you may add:
- `DocumentSearchIndex` (optional, only if you find querying three tables live is too slow to reasonably page through): id, tenantId, sourceType (`MEDIA_FILE`/`GENERATED_DOCUMENT`/`BUYER_DOCUMENT`), sourceId, searchableText (String — filename/type/tags concatenated), leadId (optional), projectId (optional), unitId (optional), updatedAt. Populate it in each source's create/update path — but since those services belong to the other engineer's portion for `GeneratedDocument`/`BuyerDocument`, **do not edit their services to write to your index table**. Instead, build `DocumentSearchIndex` as a periodically-rebuilt read cache: a `rebuildIndex(tenantId)` method that queries all three source tables fresh and upserts index rows, callable on demand from the search endpoint if the index is empty/stale, or just query the three tables live with `Promise.all` and merge+sort in memory — this is simpler and avoids any risk of touching the other engineer's files. **Prefer the live-query approach; only build the index table if you hit a real performance problem you can demonstrate with a test.**

**Service requirements:**
- `search(tenantId, query, filters: { leadId?, projectId?, unitId?, documentType? })` — searches filename/type across `MediaFile`, `GeneratedDocument` (search its `snapshot.documentType` field), and `BuyerDocument` (search its `type` enum field), respecting the caller's role: a `SALES_AGENT` should only see documents tied to leads they're assigned to (join through `Lead.assignedAgentId`), while OWNER/ADMIN/MANAGER see everything for the tenant. Pass the requesting user's role and id into the service and filter accordingly.

**Endpoints:** `GET /document-search?query=&leadId=&projectId=&unitId=&documentType=`.

**Roles:** all authenticated internal roles, with the per-role visibility restriction described above enforced in the service, not just the controller.

**Frontend:** `DocumentSearchPage.tsx` — a single search bar with filter chips, results grouped by source type, each result linking to wherever that document actually lives (media library / generated documents list — build these as plain links even if the target page's exact route isn't confirmed; use a best-guess route like `#/media` and note it in a code comment if uncertain).

**Tests:** role-based visibility restriction (a SALES_AGENT doesn't see another agent's lead's documents), search matching across all three source types.

---

### 4.11 Physical Document Custody Tracking

**Purpose:** some builders keep physical paper originals (signed agreements, registered documents) in a physical filing cabinet — track where they are, who has them checked out, and when they're due back, independent of the digital `GeneratedDocument` record.

**New Prisma model:**
- `PhysicalDocumentCustody`: id, tenantId, fileNumber (String — the physical folder/file label), bookingId (optional FK to Booking), leadId (optional FK to Lead), documentDescription (String), location (String — e.g. `"Head Office Cabinet 3, Shelf B"`), checkedOutById (optional FK to User), checkedOutAt (DateTime, optional), dueBackAt (DateTime, optional), returnedAt (DateTime, optional), scanLinkMediaFileId (optional FK to MediaFile — if a scanned copy exists), createdAt, updatedAt.

**Service requirements:**
- `create` (register a physical file), `checkOut(id, userId, dueBackAt)` — must fail if already checked out (`returnedAt` is null and `checkedOutById` is already set) with a clear "already checked out to X" error.
- `checkIn(id)` — sets `returnedAt`, clears `checkedOutById`/`checkedOutAt`.
- `findOverdue(tenantId)` — files where `dueBackAt < now` and not yet returned.
- `getHistory(fileNumber)` — full checkout/checkin history for a file (you'll need a small history table or just log via `AuditLogsService` and read audit logs back — prefer using `AuditLogsService.log()` for the history rather than building a second custom history table, to keep this module small).

**Endpoints:** `POST /physical-documents`, `GET /physical-documents?leadId=&overdue=true`, `POST /physical-documents/:id/check-out`, `POST /physical-documents/:id/check-in`.

**Roles:** OWNER/ADMIN/SUPPORT_AGENT/MANAGER.

**Frontend:** `PhysicalDocumentsPage.tsx` — list with overdue highlighting, check-out/check-in actions.

**Tests:** double-checkout prevention, overdue query correctness.

---

## 5. Definition of done for each of the 14 modules

Do not report a module as finished unless every one of these is true:

- [ ] Prisma model(s) added with a `///` doc-comment explaining why it exists, tenant-scoped, migration generated and applied (`npx prisma migrate deploy` succeeds), `npx prisma generate` run.
- [ ] Service class with real logic (not stubs) for every method listed above, injecting `TimelineService`/`AuditLogsService` where a mutation happens.
- [ ] Controller with `@Roles(...)` on every endpoint matching what's specified above, tenantId always sourced from `req.user.tenantId`.
- [ ] Module registered in `backend/src/app.module.ts` (import + add to the `imports` array).
- [ ] `.service.spec.ts` with at least 3 tests covering the specific invariants called out per module (duplicate prevention, status guards, math correctness) — not just "it creates a record."
- [ ] `backend/tsconfig` type-check clean: `cd backend && npx tsc --noEmit -p tsconfig.json`.
- [ ] Frontend page built with loading/empty/error states, registered in `App.tsx` (lazy import, path-to-page-key map entry) and `sidebar.tsx` (nav item under a sensible existing group — don't invent a new top-level sidebar section without checking if one already fits).
- [ ] `dashboard-v2` type-check clean: `cd dashboard-v2 && npx tsc --noEmit -p tsconfig.json`.
- [ ] You did not edit any file outside what you created, except the two explicitly-allowed shared files (`app.module.ts`, `App.tsx`, `sidebar.tsx`) for registration, and reciprocal-relation additions on `Tenant` (and other pre-existing models only where explicitly named above, e.g. `MediaFile` if you added a relation) in `schema.prisma`.

## 6. If something is ambiguous

Do not guess on: real third-party API credentials, tax/legal percentages, or anything the spec docs mark as requiring the tenant's own configuration. Leave a clear `// BLOCKED_EXTERNAL_DECISION: <what's missing>` comment and build the rest of the feature around a safe default (e.g., a config field left empty, a manual-entry fallback) rather than inventing a plausible-looking value.

If a Prisma model name collision or an unclear boundary comes up (e.g. you're not sure whether `Property` already covers what `ResaleListing` needs), stop and note it in your final summary rather than silently overwriting or duplicating.
