# Small Builder Revenue OS — Path to 10/10 (Pilot-Sellable)

Goal: take the existing codebase (108 backend modules, 190 Prisma models, 106 frontend pages, 134 test specs) from "built" to "a builder pays INR 50k setup + 10k/month and depends on it daily."

## Reality check (from direct audit)

Most categories already exist. This is a **depth, wiring, hardening, and polish** effort, not a rebuild.

Confirmed REAL (not mocked):
- WhatsApp Business Cloud API — Graph v20.0, 24h-window + template gating, media/interactive (`backend/src/shared/adapters/messaging.adapter.ts`)
- Telephony — Twilio voice adapter with call recording, status callback, `callLog` persistence (`backend/src/telephony/telephony.service.ts`)
- Webhook idempotency + delivery-status callbacks (`backend/src/webhooks/webhooks.service.ts`)
- Failed-webhook retry endpoint + Failures page with Retry button (`backend/src/failures/failures.controller.ts`, `dashboard-v2/src/pages/FailuresPage.tsx`)
- Portal connectors MagicBricks/99acres/Housing with payload parsing (`backend/src/portal-integrations/`)
- Source health page (`dashboard-v2/src/pages/SourceHealthPage.tsx`)
- Mikey/Jarvis proactive engine — scheduled scans for stale/leaked leads, missed calls, weak salespeople, source drops, overdue payments, no-shows; auto-task creation; 8am owner digest; full audit log with undo; per-category autonomy guardrails, quiet hours, daily caps (`backend/src/mikey/`)
- Owner surfaces — `OwnerCommandView`, `BuilderDeskPage`, `MikeyPage`

Confirmed GAPS (the real work):
- Jarvis: no single global kill switch (only 4 per-category toggles); shadow/observe mode is a no-op (blocks action but produces no draft-for-approval); autonomy defaults to acting, not observe-first; scheduling uses raw setInterval not @Cron (window-skip risk)
- Owner command center missing tiles that the backend already computes: missed calls, no-shows, bookings-this-month, explicit weak-salesperson callout, paid-source-leaking, hold-expiry
- No unified single-screen "Lead Workbench" (capabilities are spread across pages)
- Depth/verification unknown for: booking wizard end-to-end, cost-sheet lock-before-booking, buyer/partner portal completeness, source-spend import for real ROI, mobile salesperson queue
- Production hardening surface (prometheus, dead-letter view, PII-safe logging, restore testing) partially present via new uncommitted files — needs verification

## Approach

Work in the user's stated priority order, one phase at a time, each phase ending with a build + targeted tests + a demoable slice. I verify against the running app, not just compile. No phase merges without green build and passing tests for that slice.

Guiding rule: prefer surfacing/wiring existing backend capability over new backend. Most "missing" owner tiles are already computed server-side.

---

### Phase 1 — Lead Workbench (top priority)
One page a salesperson lives in. Assemble from existing modules; add glue, not new subsystems.
- Single lead detail page: buyer info, budget, project interest, source, timeline
- Action rail: Call (Twilio), WhatsApp (Cloud adapter), Schedule site visit, Hold unit, Generate cost sheet, Mark lost + reason
- Signals: duplicate warning, SLA timer, next-best-action, "Ask Jarvis for reply" draft
- Deliverable: `/leads/:id` workbench replacing scattered actions; each button hits an already-real endpoint.

### Phase 2 — Owner Command Center
Surface backend detections that exist but aren't tiled.
- Add tiles: missed calls, no-shows, bookings-this-month, weak-salesperson callout, paid-source-leaking, units-on-hold with expiry, today/tomorrow visit split
- "What should I do today" panel wired to Jarvis nextActions
- One screen answering "where is money leaking, who must act, what did Jarvis handle"

### Phase 3 — Real integrations hardening
Confirm each connector against a live sandbox; make failures loud and replayable.
- Verify WhatsApp/Twilio credentials flow end-to-end in a real test send
- Connector health per source with last-success, failure count, replay
- Delivery status surfaced on the conversation timeline
- Source-spend import (CSV) so ROI reports use real cost-per-lead
- Call recording link + outcome capture + missed-call → lead matching in UI

### Phase 4 — Site Visit OS
Booking, confirmation, location pin, pre-visit reminder, assignment, check-in/out, complete/no-show/reschedule, auto no-show recovery message, owner report (scheduled vs completed vs no-show), visit-to-booking conversion.

### Phase 5 — Inventory hold/booking hardening
Unit grid by project/tower/floor, detail drawer, status lifecycle, hold expiry + auto-release, **double-hold/double-booking prevention (race-safe transaction)**, price-sheet versioning, full unit audit history, CP/internal/public visibility.

### Phase 6 — Cost sheet + approval + booking flow
Templates (base/floor-rise/PLC/parking/GST/stamp/reg), discount request + approval workflow, version comparison, buyer-facing clean printable, negotiation rounds, **final cost sheet locked before booking**. Booking wizard from lead→unit→cost sheet, token receipt, payment schedule creation, buyer portal invite, cancellation with approval, audit log.

### Phase 7 — Payments / demand letters / ledger
Schedule milestones, demand-letter generation + WhatsApp/email send, receipt upload/generate, buyer ledger, overdue alerts, interest calculation, collection dashboard, accounts queue, monthly collection forecast.

### Phase 8 — Buyer + Partner portal polish
Buyer: booking, unit, cost sheet, schedule, receipts, demand letters, KYC upload, construction updates, tickets, statement, secure download. Partner: registration/login, inventory view, register buyer, **duplicate/buyer-lock protection**, claim dispute, visit/booking tracking, commission visibility, payout status, performance reports.

### Phase 9 — Jarvis proactive operations
Close the audited gaps: global kill switch, real shadow/draft-for-approval mode, observe-first default, migrate setInterval→@Cron. Ensure every risky action asks approval and is fully logged.

### Phase 10 — Live production synthetic testing + hardening
Daily synthetic full-journey test (portal lead → assign → WhatsApp → call → visit → hold → cost sheet → booking → payment → buyer portal) with alert on break. Verify: tenant isolation, double-booking race, webhook replay, payment/WhatsApp/IVR failure paths, permissions, mobile UI. Backups + restore test, prometheus metrics, dead-letter view, PII-safe logging (no KYC/phone/payment leakage), doc encryption.

### Phase 11 — Pilot package (parallel-izable near the end)
Importers (projects, units-from-Excel, last-90-days leads), connect 3-5 sources, WhatsApp templates, owner + sales training docs, 14-day pilot with before/after leakage/response-time/visits/bookings report.

---

## Notes
- Salesperson Mobile Queue (your item #4) folds into Phase 1's workbench + a mobile task list view — flag if you want it as its own phase.
- I'll confirm connector live-credential tests need real sandbox keys from you before Phase 3 can fully verify.
- Each phase is independently demoable and shippable, so a pilot can start after Phase 2-3 even while later phases land.

## Proposed first action
Begin Phase 1 (Lead Workbench): read the current lead detail UI + the real endpoints for call/whatsapp/visit/hold/cost-sheet/lost/dedupe/SLA/next-action, then assemble the single-page workbench.
