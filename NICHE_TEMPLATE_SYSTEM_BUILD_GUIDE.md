# Niche Template System Build Guide

Date: 2026-06-13

Project: Virtual Assistant Lead Capture, Nurture, And Conversion Platform

Scope: Build the niche template layer on top of the existing core engine.

This file is about the niche template system only. The core engine should stay generic. Do not hardcode any niche into the core lead engine.

## Goal

Build a reusable niche template system where the master admin can choose an industry template, apply it to a client workspace, customize it safely, and hand over only that client-specific setup.

The client must not see master templates, other niche templates, or other clients' configurations.

## Best Niches For This Product

This product is best for businesses where leads are valuable, follow-up matters, and conversion usually needs a call, meeting, booking, quote, demo, or consultation.

Build templates for these niches:

1. Event marketing agencies
2. Real estate agencies and property developers
3. Education institutes and coaching centers
4. High-value healthcare clinics
5. B2B service agencies
6. Financial and insurance advisors
7. Legal firms
8. Travel agencies and tour operators
9. Home improvement, construction, and interior design
10. Automotive dealerships
11. Franchise sales teams
12. SaaS demo booking teams

Do not prioritize basic restaurants or regular gyms unless the client has a high-ticket sales process.

## First Template To Build

Build this first:

**Event Marketing Agency**

Why:

- Lead value is high.
- Campaign tracking matters.
- WhatsApp follow-up matters.
- Appointment booking matters.
- Quote requests matter.
- Event date, budget, venue, guest count, and urgency all affect qualification.
- Agencies need proof of campaign ROI.

## Copy-Paste Prompt For The IDE

You are working on a production lead automation platform.

Your job is to build a niche template system on top of the existing core engine.

Do not rebuild the core engine.

Do not hardcode event agency fields directly into the generic lead model.

Do not expose master templates to the client.

Do not mix templates between clients.

Do not claim this is done unless the template can be applied to a client workspace and creates real forms, fields, campaigns, pipeline stages, rules, message templates, nurture sequences, booking settings, CRM mappings, and dashboard labels.

Read these files first:

- `CORE_ENGINE_10_10_BLUEPRINT.md`
- `FULL_AUDIT_REPORT.md`
- `MAKE_IT_10_10_EXECUTION_PROMPT.md`
- `backend/prisma/schema.prisma`
- `backend/src/app.module.ts`
- `backend/src/custom-fields/`
- `backend/src/forms/`
- `backend/src/campaigns/`
- `backend/src/message-templates/`
- `backend/src/nurture-sequences/`
- `backend/src/scoring-rules/`
- `backend/src/routing-rules/`
- `backend/src/advanced-features/`
- `backend/src/rules/`
- `dashboard/src/app/(dashboard)/`

## Core Rule

The core platform should know only generic concepts:

- lead
- contact
- campaign
- form
- field
- pipeline stage
- rule
- message template
- nurture sequence
- conversion
- booking
- CRM mapping
- timeline
- event
- failure

The niche template decides what those things mean for a specific industry.

Example:

Core field: `customField`

Event agency template fields:

- event type
- event date
- expected guests
- estimated budget
- venue status
- service needed
- sponsor interest
- urgency level

Real estate template fields:

- property type
- location
- budget
- buying timeline
- financing status
- preferred bedrooms
- site visit interest

## Required Architecture

Use this structure:

```text
Master Template Library
        |
        v
Template Application Service
        |
        v
Client Workspace Configuration
        |
        v
Client Dashboard And Automations
```

Master templates are read-only defaults.

Client-applied templates become editable client copies.

Client changes must never edit the master template.

## Database Models

Add these Prisma models if they do not exist.

```prisma
model NicheTemplate {
  id          String   @id @default(uuid())
  key         String   @unique
  name        String
  description String?
  industry    String
  version     Int      @default(1)
  status      String   @default("draft")
  config      Json
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  packs       NicheTemplatePack[]

  @@index([industry])
  @@index([status])
  @@map("niche_templates")
}

model NicheTemplatePack {
  id          String   @id @default(uuid())
  templateId  String
  template    NicheTemplate @relation(fields: [templateId], references: [id])
  type        String
  name        String
  payload     Json
  order       Int      @default(0)
  active      Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([templateId])
  @@index([type])
  @@map("niche_template_packs")
}

model ClientTemplateInstallation {
  id             String   @id @default(uuid())
  clientKey      String
  templateId     String
  templateVersion Int
  status         String   @default("installed")
  installedById  String?
  installedAt    DateTime @default(now())
  configSnapshot Json
  createdRecords Json

  @@index([clientKey])
  @@index([templateId])
  @@map("client_template_installations")
}
```

If the app is single-client deployment today, still include `clientKey`.

Use `clientKey = "default"` for the current client.

This keeps the system ready for cloning and prevents future confusion.

## Backend Module

Create:

```text
backend/src/niche-templates/
  niche-templates.module.ts
  niche-templates.controller.ts
  niche-templates.service.ts
  dto/
    create-niche-template.dto.ts
    update-niche-template.dto.ts
    apply-template.dto.ts
    template-pack.dto.ts
  templates/
    event-marketing-agency.template.ts
    real-estate.template.ts
    education-coaching.template.ts
    healthcare-clinic.template.ts
    b2b-agency.template.ts
    finance-insurance.template.ts
    legal-firm.template.ts
    travel-agency.template.ts
    home-improvement.template.ts
    automotive-dealer.template.ts
    franchise-sales.template.ts
    saas-demo.template.ts
```

Register `NicheTemplatesModule` in:

```text
backend/src/app.module.ts
```

## API Routes

Admin-only routes:

```text
GET    /niche-templates
GET    /niche-templates/:id
POST   /niche-templates
PATCH  /niche-templates/:id
DELETE /niche-templates/:id
POST   /niche-templates/:id/publish
POST   /niche-templates/:id/clone
POST   /niche-templates/:id/apply
GET    /niche-templates/installations
GET    /niche-templates/installations/:id
```

Client-safe route:

```text
GET /client-template/current
```

The client-safe route should return only the installed client configuration, not the master template library.

## Permissions

Only these roles can manage master templates:

- OWNER
- ADMIN

Only these roles can apply templates:

- OWNER
- ADMIN

Managers may customize client-applied objects after installation, but they must not edit master templates.

Sales agents, support agents, and viewers must never access master template routes.

## Template Pack Types

Each niche template should be made from packs.

Required pack types:

- `custom_fields`
- `lead_forms`
- `campaigns`
- `pipeline_stages`
- `automation_rules`
- `scoring_rules`
- `routing_rules`
- `message_templates`
- `nurture_sequences`
- `booking_settings`
- `crm_mappings`
- `conversion_goals`
- `dashboard_labels`
- `reports`
- `notification_rules`

Optional pack types:

- `sample_data`
- `saved_filters`
- `failure_rules`
- `document_templates`
- `media_categories`

## Apply Template Behavior

When applying a template:

1. Validate the template is published.
2. Validate the user is OWNER or ADMIN.
3. Validate the client does not already have a conflicting active installation.
4. Create client-specific copies of every template pack.
5. Store created record IDs in `ClientTemplateInstallation.createdRecords`.
6. Store the original template config in `configSnapshot`.
7. Emit a system event: `niche_template.installed`.
8. Add an audit log entry.
9. Return a summary of created items.

Do not directly link live client records to editable master templates.

Master template changes should not silently change client workspaces.

## Reapply Or Update Template Behavior

Do not overwrite client customizations automatically.

If template version 2 is published:

1. Compare installed version with latest version.
2. Show differences.
3. Let admin choose:
   - apply only new fields
   - apply only new templates
   - skip conflicting items
   - create duplicates with suffix
4. Store update log.

Never silently replace client fields, messages, or rules.

## Client Isolation Rules

The client dashboard must not show:

- master template library
- other niche templates
- other client installations
- internal template IDs
- hidden admin notes
- template version controls

The client dashboard may show:

- their active pipeline
- their fields
- their forms
- their campaigns
- their messages
- their nurture sequences
- their booking rules
- their dashboard labels

## Dashboard Pages

Create admin-only pages:

```text
dashboard/src/app/(dashboard)/niche-templates/page.tsx
dashboard/src/app/(dashboard)/niche-templates/[id]/page.tsx
dashboard/src/app/(dashboard)/niche-templates/apply/page.tsx
dashboard/src/app/(dashboard)/template-installations/page.tsx
```

Update navigation:

- show `Niche Templates` only to OWNER and ADMIN.
- hide from manager, sales agent, support agent, viewer.

Required UI actions:

- list templates
- view template details
- publish template
- clone template
- apply template
- view installation summary

## Event Marketing Agency Template

Build this first.

### Custom Fields

Lead/contact custom fields:

- `event_type`
- `event_date`
- `event_location`
- `expected_guests`
- `budget_range`
- `venue_status`
- `services_needed`
- `lead_source_event`
- `sponsor_interest`
- `ticketing_needed`
- `marketing_goal`
- `decision_timeline`
- `urgency_level`
- `preferred_contact_channel`

### Lead Forms

Create these forms:

1. Event Consultation Request
2. Sponsorship Campaign Inquiry
3. Ticket Sales Marketing Inquiry
4. Corporate Event Lead Form
5. Event Vendor Partnership Form

### Campaigns

Default campaigns:

- Wedding Expo Lead Capture
- Corporate Event Campaign
- Music Festival Sponsor Leads
- College Fest Campaign
- Product Launch Event Campaign
- Conference Delegate Acquisition

### Pipeline Stages

Pipeline:

1. New Inquiry
2. Contacted
3. Event Details Collected
4. Qualified
5. Proposal Needed
6. Proposal Sent
7. Follow-Up
8. Negotiation
9. Booked
10. Lost

### Scoring Rules

High score signals:

- event date within 30 days
- budget above threshold
- expected guests above threshold
- venue already booked
- asks for full-service event marketing
- replies on WhatsApp
- books consultation

Low score signals:

- no budget
- date not decided
- only asking for free ideas
- no response after multiple follow-ups

### Routing Rules

Suggested routing:

- high budget leads go to senior manager
- urgent event date leads go to fast response queue
- sponsorship leads go to partnerships team
- ticketing leads go to performance marketing team
- vendor partnership leads go to operations

### Message Templates

Create WhatsApp/email templates:

- first response
- missing details follow-up
- consultation booking invite
- proposal request confirmation
- event date urgency follow-up
- budget clarification
- no response follow-up
- reactivation after 30 days
- booked confirmation
- lost lead feedback

### Nurture Sequences

Create sequences:

- New event inquiry nurture
- Proposal follow-up sequence
- Urgent event fast-track sequence
- Sponsorship lead nurture
- Cold lead reconnect

### Booking Settings

Default booking types:

- 15-minute qualification call
- 30-minute event strategy call
- 45-minute proposal review call

### CRM Mapping

Map fields:

- name
- phone
- email
- event type
- event date
- budget
- guest count
- venue status
- source campaign
- pipeline stage
- owner

### Conversion Goals

Track:

- consultation booked
- quote requested
- proposal sent
- event booked
- retainer paid
- lost reason captured

### Reports

Default reports:

- leads by campaign
- bookings by campaign
- quote requests by source
- revenue by event type
- hot leads needing follow-up
- proposal sent but not booked

## Other Template Definitions

Create simpler first versions for these after event marketing agency.

Each must include:

- fields
- forms
- campaigns
- pipeline
- scoring
- routing
- messages
- nurture
- booking
- CRM mapping
- conversion goals

### Real Estate

Fields:

- property type
- location
- budget
- buy/rent
- bedrooms
- move-in timeline
- financing status
- site visit interest

Conversions:

- site visit booked
- property shortlisted
- quote requested
- deal closed

### Education / Coaching

Fields:

- course interest
- student age
- education level
- target exam
- preferred batch
- parent contact
- budget
- enrollment timeline

Conversions:

- counseling booked
- demo class booked
- application submitted
- enrollment completed

### High-Value Healthcare Clinic

Fields:

- treatment interest
- symptoms/concern
- preferred appointment date
- urgency
- insurance status
- previous consultation

Conversions:

- consultation booked
- treatment plan requested
- treatment booked

Important:

- Add medical disclaimer and consent controls.
- Do not make diagnosis claims.

### B2B Service Agency

Fields:

- company size
- service needed
- monthly budget
- current provider
- decision maker
- project timeline

Conversions:

- discovery call booked
- proposal requested
- deal won

### Financial / Insurance Advisors

Fields:

- product interest
- income range
- investment goal
- risk profile
- policy requirement
- consultation timeline

Conversions:

- consultation booked
- quote requested
- policy application started

Important:

- Add compliance disclaimer.
- Do not provide financial advice as automated message.

### Legal Firm

Fields:

- case type
- urgency
- location
- preferred consultation mode
- documents available
- opposing party known

Conversions:

- consultation booked
- documents uploaded
- case accepted

Important:

- Add legal disclaimer.
- Do not give legal advice automatically.

### Travel Agency

Fields:

- destination
- travel date
- number of travelers
- budget
- trip type
- visa needed
- hotel preference

Conversions:

- itinerary requested
- call booked
- quote sent
- package booked

### Home Improvement / Construction / Interior Design

Fields:

- project type
- property type
- area size
- budget
- location
- timeline
- site visit needed

Conversions:

- site visit booked
- estimate requested
- project booked

### Automotive Dealership

Fields:

- vehicle interest
- budget
- finance needed
- trade-in
- test drive date
- purchase timeline

Conversions:

- test drive booked
- finance quote requested
- purchase completed

### Franchise Sales

Fields:

- investment budget
- preferred location
- business experience
- timeline
- franchise category

Conversions:

- discovery call booked
- application submitted
- franchise agreement started

### SaaS Demo Booking

Fields:

- company size
- use case
- current tool
- budget
- decision timeline
- integration needs

Conversions:

- demo booked
- trial started
- subscription started

## Seed Files

Create seed files:

```text
backend/prisma/seed-niche-templates.ts
backend/src/niche-templates/templates/event-marketing-agency.template.ts
backend/src/niche-templates/templates/real-estate.template.ts
backend/src/niche-templates/templates/education-coaching.template.ts
backend/src/niche-templates/templates/healthcare-clinic.template.ts
backend/src/niche-templates/templates/b2b-agency.template.ts
backend/src/niche-templates/templates/finance-insurance.template.ts
backend/src/niche-templates/templates/legal-firm.template.ts
backend/src/niche-templates/templates/travel-agency.template.ts
backend/src/niche-templates/templates/home-improvement.template.ts
backend/src/niche-templates/templates/automotive-dealer.template.ts
backend/src/niche-templates/templates/franchise-sales.template.ts
backend/src/niche-templates/templates/saas-demo.template.ts
```

Each template file should export a structured object:

```ts
export const eventMarketingAgencyTemplate = {
  key: 'event-marketing-agency',
  name: 'Event Marketing Agency',
  industry: 'events',
  version: 1,
  description: 'Lead capture, qualification, proposal, and booking system for event marketing agencies.',
  packs: {
    customFields: [],
    forms: [],
    campaigns: [],
    pipelineStages: [],
    automationRules: [],
    scoringRules: [],
    routingRules: [],
    messageTemplates: [],
    nurtureSequences: [],
    bookingSettings: [],
    crmMappings: [],
    conversionGoals: [],
    dashboardLabels: [],
    reports: []
  }
};
```

## Template Application Service

The service must create records in this order:

1. custom fields
2. pipeline stages
3. campaigns
4. forms
5. message templates
6. scoring/routing/automation rules
7. nurture sequences
8. booking settings
9. CRM mappings
10. conversion goals
11. saved filters/reports

Why this order:

- forms need fields
- rules may need fields and stages
- nurture may need templates
- reports need campaigns/conversion goals

## Rollback Behavior

If template application fails halfway:

1. Stop installation.
2. Delete records created during failed install.
3. Mark installation as `failed`.
4. Store error reason.
5. Create failure record.
6. Show clear error to admin.

Do not leave half-installed client templates.

## Tests Required

Backend tests:

- owner can list templates
- sales agent cannot list master templates
- owner can apply published template
- cannot apply draft template
- applying template creates custom fields
- applying template creates forms
- applying template creates campaigns
- applying template creates pipeline stages
- applying template creates message templates
- applying template creates rules
- applying template creates nurture sequences
- installation stores created record IDs
- failed installation rolls back created records
- client-safe endpoint does not expose master template library

Dashboard tests or manual verification:

- owner sees Niche Templates nav
- sales agent does not see Niche Templates nav
- owner can open template details
- owner can apply Event Marketing Agency template
- installation summary is visible
- client pages show applied fields/forms/campaigns

## Verification Commands

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

Search checks:

```bash
rg -n "event_type|event_date|expected_guests|budget_range" backend/src/niche-templates
rg -n "Niche Templates" dashboard/src
rg -n "@Body\\([^)]*\\).*:\\s*any|@Query\\([^)]*\\).*:\\s*any" backend/src/niche-templates
```

## Final Acceptance Checklist

The niche template system is done only when:

- database models exist
- migrations exist
- backend module exists
- admin API routes exist
- client-safe route exists
- OWNER/ADMIN can manage templates
- non-admin roles cannot access master templates
- Event Marketing Agency template is fully seeded
- at least 11 other target niche templates have first versions
- template application creates real client records
- client records are editable without changing master template
- failed installation rolls back
- installation summary stores created record IDs
- dashboard admin pages exist
- client does not see master template library
- backend tests pass
- dashboard build passes
- Prisma validation passes

## Rating Rule

Use this honestly:

- 10/10: all acceptance checks pass, Event Marketing Agency is deep, and other templates have usable first versions.
- 9/10: Event Marketing Agency is complete, other templates are basic but usable.
- 8/10: backend template system works, but dashboard or secondary templates are thin.
- 7/10: templates exist as data, but application/isolation is weak.
- 6/10 or below: mostly documentation or static seed data only.

