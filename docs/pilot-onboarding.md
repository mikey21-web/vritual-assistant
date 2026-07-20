# Pilot Onboarding Playbook — 14-Day Rollout

A day-by-day guide for getting your first real-estate CRM pilot live with a
small builder. Each day has ~30–60 minutes of setup/checklist work; the rest
is the team using the system normally.

---

## Day 1 — Account & Team

- [ ] Create the builder's tenant account
- [ ] Invite the owner as ADMIN and 2–3 sales team members as SALES_AGENT
- [ ] Each user logs in, sets their password, checks they see the dashboard
- [ ] Walk through the left nav together — point out Leads, Projects, Units,
      Conversations, Reports

**Goal:** Team can log in and orient themselves. ~45 min.

---

## Day 2–3 — WhatsApp & Data Import

### WhatsApp
- [ ] Configure WhatsApp Cloud API or provider in Settings → Integrations
- [ ] Submit 2–3 message templates for approval (lead follow-up, visit
      reminder, payment due)
- [ ] Send a test message from the CRM to confirm the pipeline works

### Import
- [ ] Export existing leads from Excel/other CRM to CSV (name, phone, email,
      source, notes)
- [ ] Go to Imports → Import Leads, upload the CSV, map columns, run the
      import
- [ ] Add projects (name, location, configuration, RERA if applicable)
- [ ] Bulk-import units per project via Projects → [Project] → Units →
      Bulk Import
- [ ] Verify a few imported records look correct

**Goal:** Real data is in the system. Templates are approved or pending.

---

## Day 4–7 — Daily Ops Walkthrough

- [ ] **Day 4:** Log a new lead manually from the Leads page. Assign it to a
      sales agent. Have the agent send a WhatsApp message from the
      conversation view.
- [ ] **Day 5:** Create a follow-up task on a lead. Complete it. Check the
      activity log. Review the lead timeline.
- [ ] **Day 6:** Run a simple report (e.g. lead count by source this week).
      Export it. Show the team how reports work.
- [ ] **Day 7:** Train agents on the Workbench (AI-assisted lead engagement).
      Have each agent send at least one AI-assisted message. Review the
      response.

**Goal:** Team is comfortable with daily workflows. ~30 min/day.

---

## Day 8–10 — Site Visits & Payments

- [ ] **Day 8:** Schedule a site visit from a lead's profile. Assign it to
      an agent. The agent confirms with the buyer via WhatsApp (using the
      approved template).
- [ ] **Day 9:** Complete the visit. Mark the outcome (interested / not
      interested / reschedule). If interested, create a booking.
- [ ] **Day 10:** Set up a payment milestone on a booking (e.g. 10% on
      booking, 20% on agreement). Verify it shows up in Collections.

**Goal:** Site visit and payment flows are tested end-to-end.

---

## Day 11–13 — Channel Partners & Buyer Portal

- [ ] **Day 11:** Set up a channel partner account. Generate their referral
      link. Test that a lead coming through the link is tagged correctly.
- [ ] **Day 12:** Activate the buyer portal for one project. Share the
      portal link with a test buyer. Verify they can see project details,
      their booking, and payment schedule.
- [ ] **Day 13:** Review the partner claim workflow — partner submits a
      claim, admin approves/rejects, commission is logged.

**Goal:** Channel partner and buyer portal flows work.

---

## Day 14 — Review & Go-Live

- [ ] Walk through every module with the owner one more time
- [ ] Collect feedback: what's confusing, what's missing, what needs
      training
- [ ] Configure Mikey autonomy preferences (observe vs autonomous per
      category)
- [ ] Decide: go-live (full data migration, cut over) or extend pilot
      another week
- [ ] If go-live: schedule the full data migration and decommission old
      system

**Goal:** Owner is confident. Decision documented.

---

## Appendix: Common Pitfalls

| Pitfall | Prevention |
|---------|-----------|
| WhatsApp templates rejected | Use simple language, no placeholders in header, submit 48h before needed |
| CSV columns don't map | Export a sample CSV first, match column names to CRM fields |
| Agents don't log in daily | Set up Mikey morning digest — it sends an 8am brief to every owner/admin |
| Duplicate leads on import | Run de-duplication after import (Settings → Data → Deduplicate) |
| Payment milestones wrong | Verify payment schedule template before bulk-applying |
