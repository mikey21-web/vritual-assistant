# Sell.Do-Style OS For Small Indian Builders: Product Checklist And Build Handoff

Date: 2026-07-18

> **How to use this document:** Sections 0-45 are the product checklist and commercial intent. Section 46 onward is the implementation contract. An IDE agent must follow the implementation contract when building. Do not create a generic CRM. Build the buyer journey: lead -> response -> site visit -> unit -> cost sheet -> approval -> booking -> documents -> collection. Every record belongs to one tenant. Every state change is audited.

> **Build rule:** Implement vertically, not by isolated screens. A feature is complete only when the screen, API, database fields, permissions, timeline entry, notification/automation, empty/loading/error states, and tests all work together.

> **Current repo gap map:** After reading this product blueprint, read `docs/real-estate-current-vs-build-map.md`. That file explains what already exists in this project and what still needs to be built.

Positioning:

> A lightweight, affordable Sell.Do alternative for small and mid-size Indian builders.

Core promise:

> Give small builders the important power of Sell.Do without enterprise complexity: portal leads, WhatsApp follow-up, calls, site visits, inventory, cost sheets, booking, payments, channel partners, reports, and AI assistance in one system.

Target customer:

- [ ] Indian builder/developer with 1-5 active projects
- [ ] 5-30 salespeople
- [ ] Leads from MagicBricks, 99acres, Housing.com, Facebook, Google, WhatsApp, brokers, walk-ins
- [ ] Currently using Excel, WhatsApp groups, calling apps, Cratio/other CRM, IVR, or multiple disconnected tools
- [ ] Wants owner visibility without a heavy enterprise CRM

Pricing idea:

- [ ] Starter Builder: up to 10 users, INR 50,000 setup + INR 10,000/month
- [ ] Growth Builder: up to 25 users, INR 75,000 setup + INR 20,000/month
- [ ] Pro Builder: up to 50 users, INR 100,000 setup + INR 35,000/month
- [ ] Usage extra: WhatsApp, SMS, telephony, AI voice, custom integrations

Sell.Do public reference points:

- [ ] Sell.Do Sales/Pre-sales/Post-sales public signal: around INR 2,599/user/month
- [ ] Sell.Do Enterprise Suite public signal: around INR 3,499/user/month
- [ ] For 25 users, Sell.Do can be roughly INR 65,000-INR 1,10,000/month+ depending modules/users/usage
- [ ] Our wedge: simpler, cheaper, WhatsApp-first, AI-assisted, owner-first

Sources noted during research:

- [ ] https://www.sell.do/
- [ ] https://www.sell.do/real-estate-crm
- [ ] https://www.sell.do/product-comparison
- [ ] https://www.sell.do/real-estate-crm/inventory-management
- [ ] https://www.sell.do/real-estate-crm/channel-partner-management
- [ ] https://www.sell.do/real-estate-crm/customer-portal
- [ ] https://www.sell.do/real-estate-crm/post-sales
- [ ] https://www.sell.do/real-estate-crm/demand-letter
- [ ] https://www.sell.do/real-estate-crm/expense-management

---

## 0. Buyer Scenario: 25-Person Builder Sales Team

Example buyer:

- [ ] Real-estate builder with 25 salespeople
- [ ] Uses Cratio CRM / Salestrail / another CRM / IVR / WhatsApp / Excel
- [ ] Leads come from property portals, Meta/Google ads, brokers, website, walk-ins, WhatsApp, and calls
- [ ] Owner struggles to know who called, who followed up, which source converts, and which site visits actually happened

Likely current stack:

- [ ] CRM for lead storage
- [ ] Salestrail or call tracking app
- [ ] IVR/cloud telephony
- [ ] WhatsApp on salespeople phones
- [ ] Excel/Google Sheets for inventory and site visits
- [ ] Another CRM or ad reporting dashboard
- [ ] Manual payment follow-up by accounts team

Current-stack problems:

- [ ] Leads, calls, WhatsApp, site visits, inventory, and payments live in different tools
- [ ] Salespeople switch tabs/apps constantly
- [ ] Owner has no single source of truth
- [ ] Duplicate leads are hard to catch
- [ ] Site visit follow-up is weak
- [ ] Channel partner ownership is unclear
- [ ] Source ROI is unclear
- [ ] Paid leads leak before anyone notices

Estimated current monthly cost for a 25-person team:

- [ ] Cratio-like CRM: roughly INR 10,000-INR 20,000/month depending users/plan
- [ ] Salestrail/call tracking: roughly INR 12,000-INR 25,000/month
- [ ] IVR/cloud telephony: roughly INR 5,000-INR 25,000/month
- [ ] Extra CRM/ad/reporting tools: roughly INR 20,000-INR 40,000/month
- [ ] Total fragmented stack: often INR 30,000-INR 95,000/month depending tools and usage

Sell.Do-style cost for 25 users:

- [ ] Sales/Pre-sales plan at around INR 2,599/user/month: about INR 64,975/month
- [ ] Enterprise Suite at around INR 3,499/user/month: about INR 87,475/month
- [ ] With managers/admins/modules/usage: roughly INR 65,000-INR 1,10,000/month+
- [ ] Implementation/customization/usage may be extra depending deal

Our pricing angle:

- [ ] Starter Builder: INR 50,000 setup + INR 10,000/month for up to 10 users
- [ ] Growth Builder: INR 75,000 setup + INR 20,000/month for up to 25 users
- [ ] Pro Builder: INR 100,000 setup + INR 35,000/month for up to 50 users
- [ ] Usage-based pass-through for WhatsApp/SMS/calls/AI voice

Sales pitch for this buyer:

> Right now your team pays for multiple tools, but leads, calls, WhatsApp, site visits, inventory, and payments are still split. Sell.Do can solve this, but for 25 users it can become INR 65,000-INR 1,10,000/month+. We give you the important builder CRM workflows in one simpler system at a small-builder price.

---

## 0.1 Sell.Do Parity Checklist

Public Sell.Do-style capability areas to match over time:

- [ ] Lead management
- [ ] Pre-sales/call center
- [ ] Sales automation
- [ ] Workflow automation
- [ ] Lead scoring
- [ ] Routing and assignment
- [ ] Escalation management
- [ ] Site visit management
- [ ] WhatsApp/SMS/email/call communication
- [ ] Project inventory
- [ ] Tower inventory
- [ ] Unit inventory
- [ ] Cost sheets
- [ ] Payment schedules
- [ ] Demand letters
- [ ] Channel partner management
- [ ] Customer portal
- [ ] Booking management
- [ ] Post-sales management
- [ ] Reports and analytics
- [ ] Mobile CRM
- [ ] Marketing automation
- [ ] Campaign attribution
- [ ] AI voice agents
- [ ] Customer service/tickets
- [ ] Approval workflows
- [ ] Document management
- [ ] Integrations

Our small-builder version should simplify each one:

- [ ] Fewer confusing settings
- [ ] Faster onboarding
- [ ] Opinionated real-estate workflows
- [ ] WhatsApp-first daily work
- [ ] Owner dashboard first
- [ ] Practical AI summaries/replies before advanced enterprise AI
- [ ] Flat or capped pricing instead of painful per-user cost

---

## 0.2 What We Can Offer More Than Sell.Do For Small Builders

Small-builder advantages to build deliberately:

- [ ] Done-for-you setup included in package
- [ ] Inventory import from messy Excel sheets
- [ ] WhatsApp template setup included
- [ ] Portal/ad lead connection included
- [ ] Weekly owner report included
- [ ] Local-language WhatsApp AI replies
- [ ] Simpler owner command screen
- [ ] Simpler salesperson mobile queue
- [ ] Faster go-live for 1-5 project builders
- [ ] Lower-cost flat/team pricing
- [ ] More personal support
- [ ] Small-builder playbooks built in
- [ ] Prebuilt site visit workflows
- [ ] Prebuilt cost sheet templates
- [ ] Prebuilt payment reminder templates
- [ ] Prebuilt no-show recovery templates
- [ ] Prebuilt channel partner duplicate-protection flow
- [ ] AI owner digest by WhatsApp
- [ ] AI lead leakage alerts
- [ ] AI source quality explanation
- [ ] AI lost-lead reason clustering
- [ ] Simple "what to do today" queue for every salesperson

Do not compete by claiming to be bigger than Sell.Do.

Compete by being:

- [ ] Easier
- [ ] Faster
- [ ] Cheaper
- [ ] More focused
- [ ] More WhatsApp-native
- [ ] More hands-on for small builders

---

## Phase 1: Sellable Small Builder MVP

Goal:

- [ ] A builder can capture leads, assign them, follow up on WhatsApp/calls, schedule site visits, view inventory, and see owner-level reports.

Build first:

- [ ] Builder Desk
- [ ] Lead Inbox
- [ ] Lead Detail
- [ ] Portal/ad/WhatsApp lead capture
- [ ] Lead dedupe
- [ ] Auto assignment
- [ ] SLA alerts
- [ ] WhatsApp templates
- [ ] Call log visibility
- [ ] Site visit scheduler
- [ ] Project/unit inventory
- [ ] Source reports
- [ ] Salesperson reports
- [ ] AI lead summary
- [ ] AI WhatsApp reply
- [ ] Owner daily digest

This phase should be enough to sell:

- [ ] INR 50,000 setup + INR 10,000/month for small teams
- [ ] INR 75,000 setup + INR 20,000/month for 25-person teams

---

## 1. Builder Desk

Purpose:

- [ ] Owner's daily command screen
- [ ] Shows whether paid leads are leaking
- [ ] Shows whether salespeople are actually working
- [ ] Shows site visits, inventory, collections, and source quality in one place

Must show:

- [ ] Leads today
- [ ] New leads today
- [ ] Hot leads
- [ ] Unassigned leads
- [ ] Untouched leads
- [ ] Leads not contacted in 15 minutes
- [ ] Follow-ups overdue
- [ ] Missed calls
- [ ] Site visits today
- [ ] Site visits tomorrow
- [ ] Site visit no-shows
- [ ] Bookings this month
- [ ] Available units
- [ ] On-hold units
- [ ] Booked units
- [ ] Sold units
- [ ] Overdue payments
- [ ] Expected collection this month
- [ ] Best salesperson
- [ ] Worst salesperson
- [ ] Best lead source
- [ ] Worst lead source
- [ ] Best channel partner
- [ ] AI next actions

How to build:

- [ ] Backend endpoint: `GET /analytics/builder-command`
- [ ] Frontend page: `BuilderDeskPage`
- [ ] Pull from leads, bookings/site visits, calls, units, payment schedules, channel partners
- [ ] Show action queues instead of only charts
- [ ] Add links from each card to the relevant filtered page

---

## 2. Main Screens

Build these screens:

- [ ] Builder Desk
- [ ] Lead Inbox
- [ ] Lead Detail
- [ ] Unified Conversations
- [ ] Call Center
- [ ] Sales Pipeline
- [ ] Site Visits
- [ ] Projects
- [ ] Towers
- [ ] Units
- [ ] Inventory Grid
- [ ] Unit Detail
- [ ] Cost Sheets
- [ ] Offers & Negotiations
- [ ] Bookings
- [ ] KYC & Documents
- [ ] Payment Schedules
- [ ] Demand Letters
- [ ] Receipts
- [ ] Buyer Ledger
- [ ] Channel Partners
- [ ] Partner Portal
- [ ] Customer Portal
- [ ] Marketing Campaigns
- [ ] Lead Sources / Integration Health
- [ ] Reports
- [ ] Team Performance
- [ ] AI Agent
- [ ] Settings
- [ ] Onboarding Wizard

---

## 3. Lead Capture System

Lead sources to support:

- [ ] MagicBricks
- [ ] 99acres
- [ ] Housing.com
- [ ] IndiaMART
- [ ] JustDial
- [ ] Facebook Lead Ads
- [ ] Google Lead Forms
- [ ] Website forms
- [ ] WhatsApp click-to-chat
- [ ] QR codes
- [ ] Walk-ins
- [ ] Broker/channel partner forms
- [ ] Manual entry
- [ ] Excel/CSV import

Every lead intake should:

- [ ] Normalize phone number
- [ ] Normalize WhatsApp number
- [ ] Check duplicate by phone/WhatsApp/email
- [ ] Merge or link duplicate
- [ ] Save original source
- [ ] Save campaign/UTM fields
- [ ] Save project interest
- [ ] Save budget
- [ ] Save location preference
- [ ] Save property type/BHK
- [ ] Save raw payload
- [ ] Assign salesperson
- [ ] Send instant WhatsApp acknowledgement
- [ ] Create follow-up task
- [ ] Start SLA timer
- [ ] Add timeline event
- [ ] Log integration event

Backend services:

- [ ] `LeadIngestionService`
- [ ] `LeadDeduplicationService`
- [ ] `LeadAssignmentService`
- [ ] `LeadSourceHealthService`
- [ ] Webhook endpoints per source
- [ ] Integration event logs

---

## 4. Lead Dedupe / Buyer Identity

Problem:

- [ ] Same buyer may come from MagicBricks, Facebook, WhatsApp, phone call, broker, and website form

Match by:

- [ ] Phone
- [ ] WhatsApp
- [ ] Email
- [ ] Alternate phone
- [ ] Name + phone similarity
- [ ] Existing lead within lock period
- [ ] Channel partner ownership lock

Features:

- [ ] Duplicate warning
- [ ] Merge leads
- [ ] Link leads under same buyer/contact
- [ ] Buyer timeline across sources
- [ ] Source attribution history
- [ ] Partner duplicate protection
- [ ] Audit log for merges

Data models:

- [ ] `ContactIdentity`
- [ ] `LeadSourceTouch`
- [ ] `DuplicateCandidate`
- [ ] `LeadMergeEvent`

---

## 5. Lead Assignment

Assignment rules:

- [ ] Round robin
- [ ] Project-wise assignment
- [ ] Location-wise assignment
- [ ] Budget-wise assignment
- [ ] Source-wise assignment
- [ ] Salesperson capacity
- [ ] Language preference
- [ ] Channel partner manager mapping
- [ ] Reassignment if untouched
- [ ] Owner alert if hot lead idle

Example:

- [ ] MagicBricks leads for Project A in Pune go to Sales Team A
- [ ] If not contacted in 10 minutes, escalate to manager

Data/services:

- [ ] `AssignmentRule`
- [ ] `AssignmentHistory`
- [ ] `LeadOwnershipHistory`
- [ ] Scheduled reassignment job
- [ ] Manager notification

---

## 6. SLA System

Track:

- [ ] First response time
- [ ] First call time
- [ ] First WhatsApp time
- [ ] Lead untouched for 15 minutes
- [ ] Hot lead untouched for 2 hours
- [ ] Follow-up overdue
- [ ] Site visit not confirmed
- [ ] No-show not rescheduled
- [ ] Payment overdue

Owner alerts:

- [ ] "8 hot leads are untouched"
- [ ] "3 site visits have no assigned salesperson"
- [ ] "INR 4.5L payment overdue"
- [ ] "99acres leads are not converting"

How to build:

- [ ] `SlaRule`
- [ ] `SlaBreach`
- [ ] Scheduled scanner
- [ ] Notification system
- [ ] Daily owner digest

---

## 7. Unified Conversations

One screen should show:

- [ ] WhatsApp
- [ ] SMS
- [ ] Email
- [ ] Call logs
- [ ] Website chat
- [ ] Portal inquiry
- [ ] Notes
- [ ] AI summary
- [ ] Buyer profile
- [ ] Property match
- [ ] Site visit button
- [ ] Cost sheet button

Lead detail right panel:

- [ ] Name
- [ ] Phone
- [ ] WhatsApp
- [ ] Budget
- [ ] Location
- [ ] Property type
- [ ] Project interest
- [ ] Loan status
- [ ] Timeline
- [ ] Last interaction
- [ ] Next follow-up
- [ ] Assigned salesperson

Backend/frontend:

- [ ] `ConversationThread`
- [ ] `ConversationMessage`
- [ ] Channel adapters
- [ ] Message templates
- [ ] Delivery status
- [ ] AI reply draft
- [ ] Unified inbox page

---

## 8. WhatsApp System

Core:

- [ ] WhatsApp template library
- [ ] Instant lead acknowledgement
- [ ] Brochure send
- [ ] Price sheet send
- [ ] Location pin send
- [ ] Site visit confirmation
- [ ] Site visit reminder
- [ ] No-show reschedule
- [ ] Post-visit follow-up
- [ ] Booking confirmation
- [ ] Payment reminder
- [ ] Demand letter send
- [ ] Receipt send
- [ ] Opt-out handling
- [ ] Failed message retry
- [ ] Delivery/read status where supported

AI features:

- [ ] Rewrite in Hindi
- [ ] Rewrite in Telugu
- [ ] Rewrite in Marathi
- [ ] Rewrite in Tamil/Kannada later
- [ ] Shorten message
- [ ] Make message more polite
- [ ] Handle objection
- [ ] Create next follow-up

---

## 9. Call Center / Telephony

Core:

- [ ] Click-to-call
- [ ] Call log
- [ ] Call recording link
- [ ] Call status: answered/missed/busy/switched off
- [ ] Missed call tracking
- [ ] Call duration
- [ ] First call time
- [ ] Salesperson call count
- [ ] Call notes
- [ ] AI call summary
- [ ] Call quality score
- [ ] Follow-up after missed call

Reports:

- [ ] Calls made today
- [ ] Calls per salesperson
- [ ] Leads not called
- [ ] Hot leads not called
- [ ] Missed calls not returned
- [ ] Average response time

Integrations:

- [ ] Exotel
- [ ] Knowlarity
- [ ] MyOperator
- [ ] Twilio
- [ ] Android call tracker fallback

---

## 10. Lead Scoring

Score based on:

- [ ] Budget match
- [ ] Location match
- [ ] Property type match
- [ ] Timeline
- [ ] Loan readiness
- [ ] Source quality
- [ ] Engagement
- [ ] Calls answered
- [ ] WhatsApp replies
- [ ] Site visit scheduled
- [ ] Site visit completed

Segments:

- [ ] Hot
- [ ] Warm
- [ ] Cold
- [ ] Unqualified
- [ ] Investor
- [ ] End-user
- [ ] NRI
- [ ] Channel partner lead

Implementation:

- [ ] Rule-based score first
- [ ] AI scoring later
- [ ] Store score history
- [ ] Show "why this lead is hot"

---

## 11. Sales Pipeline

Stages:

- [ ] New
- [ ] Contacted
- [ ] Qualified
- [ ] Site Visit Scheduled
- [ ] Site Visit Done
- [ ] Negotiation
- [ ] Cost Sheet Sent
- [ ] Unit Held
- [ ] Booking Done
- [ ] Agreement
- [ ] Payment Active
- [ ] Lost

Each stage should have:

- [ ] Required fields
- [ ] Next action
- [ ] SLA
- [ ] Automation
- [ ] Reports

Example automation:

- [ ] When moved to Site Visit Scheduled, send WhatsApp confirmation
- [ ] Create calendar event
- [ ] Schedule reminders
- [ ] Prepare pre-visit brief

---

## 12. Site Visit OS

Core:

- [ ] Schedule visit
- [ ] Select project
- [ ] Select unit
- [ ] Assign salesperson
- [ ] Date/time slot
- [ ] Buyer confirmation
- [ ] WhatsApp reminder
- [ ] Google Maps link
- [ ] Check-in
- [ ] Visit outcome
- [ ] No-show reason
- [ ] Reschedule
- [ ] Post-visit feedback
- [ ] Objection capture
- [ ] Follow-up date
- [ ] Visit-to-booking report

Statuses:

- [ ] Scheduled
- [ ] Confirmed
- [ ] Reminder Sent
- [ ] Completed
- [ ] No-show
- [ ] Rescheduled
- [ ] Cancelled
- [ ] Converted

AI:

- [ ] Pre-visit brief
- [ ] Buyer objections
- [ ] Suggested pitch
- [ ] Post-visit follow-up message

---

## 13. Project / Tower / Unit Inventory

Entities:

- [ ] Project
- [ ] Tower
- [ ] Floor
- [ ] Unit

Unit fields:

- [ ] Unit type
- [ ] Carpet area
- [ ] Saleable area
- [ ] Facing
- [ ] Floor rise
- [ ] Base price
- [ ] Total price
- [ ] Status
- [ ] Availability
- [ ] Hold status
- [ ] Booking status
- [ ] Sold status
- [ ] Unit history
- [ ] Bulk upload

Views:

- [ ] Unit table
- [ ] Tower grid
- [ ] Floor grid
- [ ] Availability heatmap
- [ ] Price filter
- [ ] BHK filter
- [ ] Facing filter
- [ ] Status filter

Statuses:

- [ ] Available
- [ ] On hold
- [ ] Booked
- [ ] Sold
- [ ] Blocked
- [ ] Mortgage blocked
- [ ] Management blocked

---

## 14. Unit Hold System

Core:

- [ ] Hold unit for buyer
- [ ] Hold expiry
- [ ] Held by salesperson
- [ ] Held by lead
- [ ] Convert hold to booking
- [ ] Release hold
- [ ] Prevent double booking
- [ ] Owner override
- [ ] Hold history

Rules:

- [ ] Hold expires after configured hours/days
- [ ] Only manager can extend
- [ ] Booked unit cannot be held
- [ ] Sold unit cannot be edited except owner
- [ ] Every status change logged

---

## 15. Cost Sheet System

Fields:

- [ ] Project
- [ ] Unit
- [ ] Buyer
- [ ] Base price
- [ ] Carpet area
- [ ] Rate per sqft
- [ ] Floor rise
- [ ] PLC
- [ ] Parking
- [ ] Clubhouse
- [ ] Corpus
- [ ] Maintenance
- [ ] Legal charges
- [ ] GST
- [ ] Stamp duty
- [ ] Registration
- [ ] Discount
- [ ] Scheme
- [ ] Total agreement value
- [ ] Booking amount
- [ ] Payment plan

Features:

- [ ] Template-based cost sheet
- [ ] Project-level cost sheet template
- [ ] Unit-level customization
- [ ] PDF export
- [ ] WhatsApp share
- [ ] Approval before sending
- [ ] Version history

---

## 16. Payment Schemes

Plans:

- [ ] Construction-linked plan
- [ ] Time-linked plan
- [ ] Down payment plan
- [ ] Subvention plan
- [ ] Custom plan
- [ ] Festival offer plan
- [ ] Early bird plan

Each plan:

- [ ] Milestone name
- [ ] Percentage
- [ ] Amount
- [ ] Due trigger
- [ ] Due date
- [ ] Reminder schedule

---

## 17. Offer / Negotiation Management

Core:

- [ ] Buyer offer
- [ ] Salesperson proposed discount
- [ ] Manager counter
- [ ] Owner approval
- [ ] Approved offer
- [ ] Rejected offer
- [ ] Expiry date
- [ ] Notes
- [ ] Audit history

Discount types:

- [ ] Flat discount
- [ ] Per sqft discount
- [ ] Waive parking
- [ ] Waive floor rise
- [ ] Free modular kitchen
- [ ] Festival scheme
- [ ] GST/tax-related discount handling reviewed carefully with accountant/legal advisor

---

## 18. Booking System

Booking flow:

- [ ] Select lead
- [ ] Select project
- [ ] Select unit
- [ ] Select approved cost sheet
- [ ] Enter booking amount
- [ ] Add buyer details
- [ ] Add co-applicant
- [ ] Upload KYC
- [ ] Generate booking form
- [ ] Mark unit booked
- [ ] Create payment schedule
- [ ] Send confirmation

Booking fields:

- [ ] Buyer
- [ ] Co-buyer
- [ ] Unit
- [ ] Booking amount
- [ ] Payment mode
- [ ] Receipt
- [ ] PAN
- [ ] Aadhaar
- [ ] Address
- [ ] Loan required
- [ ] Bank
- [ ] Channel partner
- [ ] Salesperson

---

## 19. KYC / Documents

Checklist:

- [ ] PAN
- [ ] Aadhaar
- [ ] Address proof
- [ ] Passport photo
- [ ] Salary proof
- [ ] Bank statement
- [ ] Loan sanction letter
- [ ] Booking form
- [ ] Allotment letter
- [ ] Agreement draft
- [ ] Signed agreement
- [ ] NOC
- [ ] Possession letter

Features:

- [ ] Upload
- [ ] Buyer upload link
- [ ] Verify
- [ ] Reject
- [ ] Missing documents report
- [ ] Expiry tracking
- [ ] Document timeline

---

## 20. Demand Letters

Core:

- [ ] Demand letter template
- [ ] Auto-generate per payment milestone
- [ ] Buyer details
- [ ] Unit details
- [ ] Amount due
- [ ] GST/tax details
- [ ] Bank details
- [ ] Due date
- [ ] PDF
- [ ] WhatsApp/email send
- [ ] Delivery status
- [ ] Reminder schedule

Triggers:

- [ ] Milestone due
- [ ] Construction stage reached
- [ ] Payment overdue
- [ ] Manual send

---

## 21. Receipts And Ledger

Core:

- [ ] Receipt number
- [ ] Payment mode
- [ ] Amount
- [ ] Tax
- [ ] UTR/check/DD number
- [ ] Linked milestone
- [ ] PDF receipt
- [ ] Buyer ledger
- [ ] Outstanding amount
- [ ] Interest if overdue
- [ ] Download/share

Reports:

- [ ] Collection today
- [ ] Collection this month
- [ ] Overdue
- [ ] Expected collection
- [ ] Project-wise collection
- [ ] Buyer-wise ledger

---

## 22. Customer Portal

Use magic-link login first.

Buyer can:

- [ ] View booked unit
- [ ] View payment schedule
- [ ] Pay booking amount
- [ ] Upload KYC
- [ ] Download receipts
- [ ] Download demand letters
- [ ] Raise ticket
- [ ] View construction updates
- [ ] View agreement documents
- [ ] Contact relationship manager

---

## 23. Channel Partner Management

Core:

- [ ] Partner onboarding
- [ ] RERA ID
- [ ] KYC
- [ ] Approval
- [ ] Partner login
- [ ] Partner dashboard
- [ ] Lead registration
- [ ] Duplicate protection
- [ ] Inventory access
- [ ] Site visit status
- [ ] Booking status
- [ ] Commission calculation
- [ ] Payout status
- [ ] Leaderboard
- [ ] Partner performance

Partner flow:

- [ ] Partner registers lead
- [ ] System checks duplicate
- [ ] Builder accepts/rejects
- [ ] Partner tracks lead
- [ ] Visit happens
- [ ] Booking happens
- [ ] Commission generated
- [ ] Payout tracked

---

## 24. Marketing Automation

Campaign types:

- [ ] Campaigns
- [ ] Segments
- [ ] Lead nurturing
- [ ] Bulk WhatsApp
- [ ] Bulk SMS
- [ ] Bulk email
- [ ] Drip campaigns
- [ ] Re-engagement campaigns
- [ ] Festival campaigns
- [ ] New launch campaigns
- [ ] Site visit campaigns
- [ ] Referral campaigns

Segments:

- [ ] Budget
- [ ] Location
- [ ] Project
- [ ] BHK
- [ ] Timeline
- [ ] Source
- [ ] Stage
- [ ] No response
- [ ] Site visit done
- [ ] Lost lead
- [ ] Investor

Reports:

- [ ] Sent
- [ ] Delivered
- [ ] Read
- [ ] Replied
- [ ] Site visits created
- [ ] Bookings created

---

## 25. Attribution

Track:

- [ ] Source
- [ ] Campaign
- [ ] UTM source
- [ ] UTM medium
- [ ] UTM campaign
- [ ] Portal
- [ ] Ad set
- [ ] Keyword
- [ ] Channel partner
- [ ] First touch
- [ ] Last touch

Reports:

- [ ] Leads by source
- [ ] Cost per lead
- [ ] Cost per site visit
- [ ] Cost per booking
- [ ] Conversion by source
- [ ] Revenue by source
- [ ] Wasted source report

---

## 26. Reports And Dashboards

Reports:

- [ ] Lead report
- [ ] Source report
- [ ] Campaign report
- [ ] Salesperson report
- [ ] Site visit report
- [ ] Booking report
- [ ] Inventory report
- [ ] Collection report
- [ ] Channel partner report
- [ ] Lost reason report
- [ ] SLA report
- [ ] Call report
- [ ] WhatsApp report
- [ ] Payment overdue report
- [ ] Owner daily digest

Advanced later:

- [ ] Drag/drop report builder
- [ ] Export CSV/PDF
- [ ] Scheduled email/WhatsApp reports

---

## 27. AI System

AI Phase 1:

- [ ] AI lead summary
- [ ] AI WhatsApp reply
- [ ] AI follow-up suggestion
- [ ] AI property matcher
- [ ] AI objection handler
- [ ] AI owner digest

AI Phase 2:

- [ ] AI call summary
- [ ] AI call quality
- [ ] AI lost reason clustering
- [ ] AI campaign generator
- [ ] AI source quality insights

AI Phase 3:

- [ ] AI voice agent
- [ ] Lead qualification calls
- [ ] Site visit booking calls
- [ ] No-show recovery calls
- [ ] Payment reminder calls

Voice agent script checklist:

- [ ] Greet buyer
- [ ] Confirm interest
- [ ] Ask budget
- [ ] Ask location
- [ ] Ask BHK
- [ ] Ask timeline
- [ ] Ask loan status
- [ ] Offer site visit
- [ ] Confirm WhatsApp follow-up
- [ ] Update CRM

---

## 28. Mobile App / PWA

Build PWA first.

Salesperson mobile:

- [ ] My leads
- [ ] Call queue
- [ ] WhatsApp button
- [ ] Today's visits
- [ ] Check-in
- [ ] Visit outcome
- [ ] Add note
- [ ] Upload document
- [ ] Send brochure
- [ ] Request discount

Manager mobile:

- [ ] Team leads
- [ ] Untouched leads
- [ ] Site visits
- [ ] Approvals
- [ ] Payments overdue

Channel partner mobile:

- [ ] Register lead
- [ ] Track status
- [ ] See inventory
- [ ] Commission

Buyer mobile:

- [ ] Payments
- [ ] Documents
- [ ] Tickets
- [ ] Updates

---

## 29. Security / Admin

Build:

- [ ] Roles
- [ ] Permissions
- [ ] Teams
- [ ] Branches
- [ ] Project access
- [ ] Audit logs
- [ ] Data export
- [ ] Login history
- [ ] Field-level permissions
- [ ] Partner-limited access
- [ ] Buyer-limited access

Roles:

- [ ] Owner
- [ ] Admin
- [ ] Sales manager
- [ ] Salesperson
- [ ] Pre-sales caller
- [ ] Collection manager
- [ ] Channel partner
- [ ] Buyer
- [ ] Viewer

---

## 30. Onboarding And Support

Build:

- [ ] Setup checklist
- [ ] Project import
- [ ] Unit import
- [ ] Team import
- [ ] Channel partner import
- [ ] Lead import
- [ ] WhatsApp template setup
- [ ] Portal setup
- [ ] Training status
- [ ] Go-live checklist

INR 50,000 setup should include:

- [ ] Inventory upload
- [ ] Team setup
- [ ] Lead stages
- [ ] WhatsApp templates
- [ ] Portal/ad lead capture
- [ ] Training
- [ ] First report

Monthly maintenance should include:

- [ ] Hosting
- [ ] Support
- [ ] Template changes
- [ ] Weekly report
- [ ] Small workflow changes
- [ ] Lead source monitoring

---

## 31. Integrations

Build/support:

- [ ] WhatsApp Business API
- [ ] Exotel
- [ ] Knowlarity
- [ ] MyOperator
- [ ] Twilio
- [ ] Facebook Lead Ads
- [ ] Google Lead Forms
- [ ] MagicBricks
- [ ] 99acres
- [ ] Housing.com
- [ ] IndiaMART
- [ ] JustDial
- [ ] Razorpay
- [ ] Google Calendar
- [ ] Gmail/SMTP
- [ ] SMS provider
- [ ] Google Sheets import/export
- [ ] Zapier/Pabbly later
- [ ] ERP export later

---

## 32. Data Models Needed

Core:

- [ ] Tenant
- [ ] User
- [ ] Role
- [ ] Contact
- [ ] Lead
- [ ] LeadSourceTouch
- [ ] LeadAssignmentHistory
- [ ] Conversation
- [ ] Message
- [ ] CallLog
- [ ] Task
- [ ] SiteVisit
- [ ] Project
- [ ] Tower
- [ ] Unit
- [ ] UnitStatusHistory
- [ ] UnitHold
- [ ] CostSheet
- [ ] CostSheetLineItem
- [ ] PaymentPlan
- [ ] PaymentMilestone
- [ ] Booking
- [ ] BuyerDocument
- [ ] DemandLetter
- [ ] Receipt
- [ ] LedgerEntry
- [ ] ChannelPartner
- [ ] PartnerLeadRegistration
- [ ] Commission
- [ ] Campaign
- [ ] Template
- [ ] IntegrationEvent
- [ ] Notification
- [ ] SlaRule
- [ ] SlaBreach
- [ ] ApprovalRequest
- [ ] AuditLog

---

## 33. Build Order

Phase 1: Small Builder MVP

- [ ] Builder Desk
- [ ] Lead Inbox
- [ ] Portal lead capture
- [ ] WhatsApp templates
- [ ] Assignment rules
- [ ] SLA alerts
- [ ] Site visits
- [ ] Project/unit inventory
- [ ] Source reports
- [ ] Owner digest

Phase 2: Sales Engine

- [ ] Unified conversations
- [ ] Call center
- [ ] Lead scoring
- [ ] Property matcher
- [ ] Cost sheet
- [ ] Unit hold
- [ ] Negotiation/discount approval
- [ ] Booking wizard

Phase 3: Post-Sales

- [ ] Payment schedules
- [ ] Demand letters
- [ ] Receipts
- [ ] Buyer ledger
- [ ] KYC/documents
- [ ] Customer portal

Phase 4: Channel Partner OS

- [ ] Partner onboarding
- [ ] Partner lead registration
- [ ] Duplicate protection
- [ ] Partner inventory access
- [ ] Commission ledger
- [ ] Partner portal

Phase 5: AI + Enterprise

- [ ] AI call summary
- [ ] AI voice agent
- [ ] Drag/drop reports
- [ ] Territory management
- [ ] GPS field tracking
- [ ] Advanced integrations
- [ ] Custom report builder

---

## 34. What We Should Do Better Than Sell.Do For Small Builders

- [ ] Simpler UI
- [ ] Faster setup
- [ ] Cheaper monthly cost
- [ ] WhatsApp-first workflow
- [ ] Owner-first dashboard
- [ ] Done-for-you onboarding
- [ ] Built for 5-50 person builder teams
- [ ] AI summaries and replies from day one
- [ ] Less enterprise complexity

Positioning line:

> Sell.Do is powerful for large developers. We are the affordable AI sales OS for small Indian builders who want portal leads, WhatsApp follow-up, site visits, inventory, and owner visibility without enterprise complexity.

---

## 35. Minimum Demo That Should Sell

Demo flow:

- [ ] MagicBricks lead enters system
- [ ] System detects duplicate/no duplicate
- [ ] Lead assigned to salesperson
- [ ] WhatsApp reply auto-sent
- [ ] Owner sees lead in Builder Desk
- [ ] Salesperson opens lead
- [ ] AI summarizes buyer
- [ ] Salesperson schedules site visit
- [ ] Reminder goes to buyer
- [ ] Buyer visits
- [ ] Salesperson marks visit done
- [ ] AI suggests matching units
- [ ] Cost sheet generated
- [ ] Unit held
- [ ] Booking amount added
- [ ] Payment schedule created
- [ ] Owner sees source-to-booking report

This is the first complete story to build and demo.

---

## 36. 10/10 Upgrade: What Makes This Worth Paying For

The product becomes a 10/10 only when it is not just feature-rich, but obviously tied to money saved, leads recovered, bookings created, and owner control.

Non-negotiable buyer outcomes:

- [ ] Reduce missed/untouched leads
- [ ] Increase first-response speed
- [ ] Increase site visits
- [ ] Improve site-visit-to-booking conversion
- [ ] Show which lead sources waste money
- [ ] Show which salespeople actually work leads
- [ ] Stop duplicate/channel partner disputes
- [ ] Reduce no-shows through reminders and recovery
- [ ] Reduce payment follow-up leakage
- [ ] Give owner one daily command screen

The product should prove ROI with these numbers:

- [ ] First response time before vs after
- [ ] Untouched leads before vs after
- [ ] Site visits per week before vs after
- [ ] No-show percentage before vs after
- [ ] Bookings per source
- [ ] Cost per booking
- [ ] Salesperson activity by call/WhatsApp/follow-up
- [ ] Overdue collection recovered
- [ ] Units held/booked/sold by month

---

## 37. MVP Acceptance Criteria

The MVP is not ready to sell until these are true:

- [ ] A new MagicBricks/99acres/Housing/Facebook/website lead can enter automatically
- [ ] Lead is deduped by phone/WhatsApp
- [ ] Lead is assigned automatically or shown as unassigned
- [ ] WhatsApp acknowledgement can be sent
- [ ] Salesperson can call/WhatsApp from the lead page
- [ ] Salesperson can schedule a site visit
- [ ] Buyer receives site visit confirmation/reminder
- [ ] Salesperson can mark site visit completed/no-show
- [ ] Salesperson can see matching projects/units
- [ ] Manager can see untouched/stale leads
- [ ] Owner can see leads, visits, source performance, and salesperson performance
- [ ] Project/tower/unit inventory can be imported
- [ ] Unit can be marked available/on hold/booked/sold
- [ ] Payment milestone can be created and reminded
- [ ] AI can summarize lead and suggest reply
- [ ] System works on mobile browser for salespeople

MVP demo must finish in under 10 minutes:

- [ ] Lead enters
- [ ] Assignment happens
- [ ] WhatsApp follow-up happens
- [ ] Site visit is scheduled
- [ ] Unit is matched
- [ ] Cost sheet or booking intent is shown
- [ ] Owner sees the activity instantly

---

## 38. Sales Package Checklist

What to include in setup:

- [ ] Business profile setup
- [ ] Project setup
- [ ] Unit inventory import
- [ ] Lead stages setup
- [ ] Sales team/user setup
- [ ] Assignment rule setup
- [ ] WhatsApp templates setup
- [ ] Portal/ad lead source setup
- [ ] Site visit workflow setup
- [ ] Owner dashboard setup
- [ ] First weekly report setup
- [ ] Team training session
- [ ] Owner training session

What to include monthly:

- [ ] Hosting
- [ ] Monitoring
- [ ] Bug fixes
- [ ] WhatsApp template changes
- [ ] Minor workflow changes
- [ ] Weekly owner report
- [ ] Lead source health check
- [ ] Monthly review call
- [ ] Data cleanup support

What to charge extra for:

- [ ] WhatsApp API usage
- [ ] SMS usage
- [ ] Telephony/IVR usage
- [ ] AI voice agent minutes
- [ ] Heavy custom reports
- [ ] New custom integrations
- [ ] Buyer mobile app beyond portal
- [ ] Dedicated support person
- [ ] On-site training

---

## 39. Sales Pitch And Objection Handling

Primary pitch:

> You are already paying for leads. We stop those paid leads from leaking by putting portal leads, WhatsApp, calls, site visits, inventory, payments, and owner reports in one small-builder sales desk.

Against current fragmented stack:

- [ ] "You do not need more tools. You need one control room."
- [ ] "Your CRM, call app, IVR, WhatsApp, and Excel do not tell one story."
- [ ] "We connect lead to call to site visit to booking to payment."

Against Sell.Do:

- [ ] "Sell.Do is powerful for large developers. We give small builders the most important workflows without enterprise complexity."
- [ ] "You get hands-on setup, simpler UI, and small-builder pricing."
- [ ] "Your sales team will actually use it because the daily queue is simple."

Against cheap CRM:

- [ ] "Cheap CRMs store leads. This runs the site-visit and booking workflow."
- [ ] "A builder does not need generic CRM; a builder needs inventory, visits, cost sheets, payments, and brokers connected."

Objections:

- [ ] Too expensive: show one recovered booking pays for months
- [ ] Team will not use it: show mobile sales queue and WhatsApp-first workflow
- [ ] We already have CRM: show tab-switching and source-to-booking gaps
- [ ] Sell.Do has more features: agree, then position simpler and affordable for smaller teams
- [ ] We use Excel: show inventory import and owner report

---

## 40. Moat Checklist

Build defensibility through workflow depth and local execution:

- [ ] Real-estate-specific data model
- [ ] Indian portal/ad/WhatsApp lead capture
- [ ] Builder-specific site visit workflow
- [ ] Project/tower/unit inventory
- [ ] Channel partner duplicate protection
- [ ] Cost sheet templates
- [ ] Payment/demand-letter workflow
- [ ] Owner digest tuned for builders
- [ ] Local-language WhatsApp AI
- [ ] Done-for-you onboarding
- [ ] Small-builder reports and playbooks
- [ ] Historical source-to-booking attribution
- [ ] Sticky buyer/channel partner/customer portals

The moat is not one AI feature. The moat is the complete daily workflow.

---

## 41. Implementation Guardrails

Avoid building a bloated enterprise system first.

Rules:

- [ ] Every feature must connect to lead, visit, booking, payment, or owner visibility
- [ ] Build mobile-first for salesperson workflows
- [ ] Build owner-first for dashboards
- [ ] Keep setup opinionated with default stages/templates
- [ ] Prefer WhatsApp-first actions
- [ ] Avoid generic CRM complexity
- [ ] Avoid construction ERP/procurement/accounting until sales OS is strong
- [ ] Ship one complete workflow before adding five incomplete modules
- [ ] Measure activation: lead captured, contacted, visit scheduled, visit completed, booking created

---

## 42. Product Quality Bar

For a paying builder, the app must feel reliable.

Quality checklist:

- [ ] No lead should be lost silently
- [ ] Every webhook creates success/failure log
- [ ] Every WhatsApp/call action appears in lead timeline
- [ ] Every assignment is auditable
- [ ] Every unit status change is auditable
- [ ] Duplicate detection is visible and explainable
- [ ] Reports match underlying records
- [ ] Salesperson pages load fast on mobile
- [ ] Owner dashboard loads in under 3 seconds with cached aggregates if needed
- [ ] Failed integrations show clear action needed
- [ ] Data import has preview, validation, and rollback
- [ ] Role permissions prevent partner/buyer data leakage

---

## 43. 90-Day Build Plan

Days 1-15:

- [ ] Builder Desk
- [ ] Lead Inbox improvements
- [ ] Lead source health
- [ ] Basic dedupe
- [ ] Basic assignment
- [ ] WhatsApp template send

Days 16-30:

- [ ] Site Visit OS
- [ ] Salesperson mobile queue
- [ ] Owner daily digest
- [ ] Source report
- [ ] Team performance report

Days 31-45:

- [ ] Inventory import hardening
- [ ] Unit grid polish
- [ ] Unit hold
- [ ] Project/unit matcher
- [ ] AI lead summary and reply

Days 46-60:

- [ ] Cost sheet generator
- [ ] Discount approval
- [ ] Booking wizard
- [ ] Booking confirmation templates

Days 61-75:

- [ ] Payment schedule upgrades
- [ ] Demand letters
- [ ] Receipts
- [ ] Buyer ledger
- [ ] Collection dashboard

Days 76-90:

- [ ] Channel partner portal MVP
- [ ] Partner duplicate protection
- [ ] Buyer portal MVP
- [ ] Polish demo flow
- [ ] Pilot onboarding checklist

---

## 44. Pilot Launch Checklist

Before charging first pilot:

- [ ] Pick one builder with 1-3 projects
- [ ] Import projects and units
- [ ] Import last 90 days leads
- [ ] Set up 3-5 lead sources
- [ ] Set up 5-10 WhatsApp templates
- [ ] Train owner and manager
- [ ] Train sales team
- [ ] Run for 14 days
- [ ] Measure first response time
- [ ] Measure site visits
- [ ] Measure no-shows
- [ ] Measure bookings
- [ ] Capture testimonial
- [ ] Convert pilot to paid monthly

Pilot success criteria:

- [ ] At least 80% of new leads captured in system
- [ ] At least 70% of salespeople active weekly
- [ ] First response time visible
- [ ] Site visits tracked
- [ ] Owner uses Builder Desk at least 3 times/week
- [ ] One report convinces owner of source/team visibility

---

## 45. Final 10/10 Definition

This becomes a 10/10 product when:

- [ ] Builder owner opens Builder Desk every morning
- [ ] Salespeople use the mobile lead queue daily
- [ ] Leads from portals/ads/WhatsApp stop leaking
- [ ] Site visits are scheduled and followed up automatically
- [ ] Inventory status is trusted
- [ ] Cost sheets and bookings happen inside the system
- [ ] Payments and demand letters are tracked
- [ ] Channel partner disputes reduce
- [ ] AI saves salesperson and owner time every day
- [ ] Builder can clearly say: "This gave me control over my sales team and leads."

---

## 46. Implementation Contract: Read This Before Writing Code

This section converts the checklist above into unambiguous construction instructions.

### 46.1 Existing codebase: use this, do not replace it

- Backend: NestJS in `backend/src`, Prisma in `backend/prisma/schema.prisma`, PostgreSQL database, BullMQ/Redis for delayed work.
- Web app: React 19 + Vite in `dashboard-v2/src`.
- AI service: Python service in `agent-service`; the NestJS backend calls it. Never expose an LLM key in the browser.
- Existing real-estate foundations: `Lead`, `Contact`, `ConversationMessage`, `CallLog`, `Project`, `Tower`, `Unit`, `Booking`, `PaymentSchedule`, and `ChannelPartner` already exist in Prisma. Extend them carefully; do not duplicate them with similarly named tables.
- Existing module folders should own their behavior: `leads`, `portal-integrations`, `conversations`, `telephony`, `bookings`, `projects`, `payment-schedules`, `channel-partners`, `analytics`, `automation`, `notifications`, `media`, and `audit-logs`.
- Existing pages to extend first: `LeadsPage.tsx`, `BuilderDeskPage.tsx`, `ProjectsPage.tsx`, `ProjectDetailPage.tsx`, `BookingPage.tsx`, `PaymentSchedulesPage.tsx`, `ChannelPartnersPage.tsx`, `MessagesPage.tsx`, `CallsPage.tsx`, `ReportsPage.tsx`, and `SettingsPage.tsx`.

### 46.2 Non-negotiable engineering rules

- Every query and mutation must filter by `tenantId` taken from the authenticated user, never from an untrusted browser body field.
- Money is stored in paise as an integer in new models (`amountPaise BigInt` or `Int` where safe), never as a floating-point number. Existing `Float` fields may be read during migration but new financial calculations use paise.
- Store dates in UTC. Display them in the tenant's configured India timezone (`Asia/Kolkata` by default).
- Every external webhook must be idempotent: store provider name + provider event ID in a unique `IntegrationEvent` record before doing work. A provider retry must never create a second lead, message, booking, or payment.
- Every unit change, ownership change, booking decision, offer decision, document verification decision, and payment adjustment creates an audit record with actor, time, old value, new value, reason, and request ID.
- Use Prisma transactions and conditional updates for inventory, holds, and bookings. Never rely on the frontend to prevent double booking.
- Use signed, short-lived URLs for buyer documents. Never put KYC documents in a public bucket or public `publicUrl`.
- Do not put PAN, Aadhaar/VID, document passwords, bank details, or raw KYC XML in logs, AI prompts, analytics events, exports, or browser local storage.
- All mutating endpoints need role checks, DTO validation, rate limiting where public, and an integration-safe error response.
- Add a visible `Integration health` state whenever a portal/WhatsApp/telephony event cannot be delivered. Silent failure loses money.

### 46.3 Roles and permissions

Use the existing `UserRole` for the base role and add a real-estate module-permission matrix. A user sees only the lowest amount of data needed for their work.

| Role | May do | Must not do |
| --- | --- | --- |
| Owner | all reports, pricing/discount approval, booking cancellation, full export, all projects | none except irreversible deletion without a second confirmation |
| Admin | setup, import, users, templates, integrations, projects, reports | approve owner-only discounts or view documents when denied by policy |
| Manager | team leads, reassignment, visit outcomes, holds, offer approval within limit | change RERA/bank settings, export all KYC, see other tenant data |
| Sales agent | assigned/shared leads, messages, calls, site visits, draft cost sheets, request hold/discount | approve discounts, book/sell a unit, change payments, view team private notes |
| Collections agent | buyer documents required for collection, schedules, receipts, demand letters | sales assignment and pricing changes |
| Channel partner | own registered leads, approved project material, own commissions | other partners' leads, internal prices, buyer KYC, internal notes |
| Buyer | own booking, approved documents, demand letters, receipts, payment status | any other buyer or internal workflow |

Implement permissions in `backend/src/module-permissions` as a named capability check such as `can(user, 'unit.hold')`; do not scatter raw role comparisons through controllers. Add module names for `REAL_ESTATE_SALES`, `INVENTORY`, `BOOKINGS`, `COLLECTIONS`, `KYC`, `CHANNEL_PARTNERS`, and `REPORTS`.

### 46.4 Global UI shell

The left sidebar order must match a builder's daily work:

1. Builder Desk
2. Work Queue
3. Leads
4. Conversations and Calls
5. Site Visits
6. Projects and Inventory
7. Cost Sheets and Offers
8. Bookings and KYC
9. Collections
10. Channel Partners
11. Marketing and Sources
12. Reports
13. Settings and Integration Health

Global top bar: tenant/project switcher, universal search (lead phone, buyer name, unit number), a `+` quick action menu, notifications, and user menu. On a phone, show only Work Queue, Leads, Visits, Inventory, and More. Any page with a list must have: saved filters, search, date/project/owner/status filters, count, CSV export only when allowed, pagination, empty state, loading skeleton, and an error/retry state.

### 46.5 Required shared behavior

- `TimelineItem`: write one for every meaningful event and render it consistently in Lead Detail, Unit Detail, Booking Detail, Partner Detail, and Buyer Portal.
- `Task`: every automation that expects a human action creates a task with assignee, due time, priority, link target, and completion reason.
- `Notification`: in-app first, then configured WhatsApp/email/SMS escalation. Deduplicate repeated notifications for the same entity and SLA breach.
- `AuditLog`: immutable for normal users. Owner can view but cannot edit it.
- `FileUpload`: virus scan/status, mime and size allow-list, checksum, signed download URL, retention metadata, and deletion request workflow.
- `Approval`: common object for discount, exceptional unit hold, booking cancellation, price override, and payment waiver. It needs requester, policy snapshot, amount/impact, status, approver, reason, expiry, and audit trail.

---

## 47. The One End-to-End Flow To Build First

Build and test this before expanding any module. It is the demo and the proof that the architecture is right.

1. A MagicBricks, 99acres, Housing.com, Meta, Google form, website form, WhatsApp, walk-in, CSV, or partner lead arrives at `POST /portal-integrations/:provider/webhook` or `POST /leads`.
2. `LeadIngestionService` authenticates the source, saves the raw payload in an encrypted/redacted integration event, normalizes the phone to E.164, finds/creates `Contact`, checks duplicate policy, finds/creates `Lead`, writes timeline events, and returns HTTP 200 only after the idempotency event is safely recorded.
3. `LeadAssignmentService` applies enabled routing rules. If none match, place the lead in the unassigned queue. Create the first-response task and SLA deadline.
4. A BullMQ job sends a pre-approved WhatsApp acknowledgement only when the contact has the required consent/channel eligibility. It records delivery state in `ConversationMessage` and never claims delivery until the provider webhook confirms it.
5. The salesperson opens Lead Detail, sees a short AI summary clearly marked `draft`, calls/messages, qualifies the buyer, and schedules a site visit.
6. The visit gets a calendar slot, internal assignee, Google Maps link, reminder jobs, and a buyer confirmation. Check-in requires a manual button plus optional GPS; GPS must be optional and consented.
7. After a completed visit, the salesperson selects a unit. The system calculates a versioned cost sheet, requests discount approval if required, and may create a timed unit hold.
8. A manager confirms the booking only after required booking fields, approved price/cost sheet, payment entry, and document checklist policy pass. The transaction atomically changes unit status from `ON_HOLD` to `BOOKED`, creates the booking, payment schedule, receipt stub, timeline/audit events, and notifications.
9. Collections users issue demand letters, record payments/reconciliation, upload receipt, and the buyer portal reflects only verified data.
10. Builder Desk aggregates all stages with links to the actual queue, not decorative charts.

**End-to-end acceptance test:** seed two sales agents, one project/tower/unit, and one lead source; submit a provider payload twice; confirm one contact/lead exists; confirm assignment/SLA/task/message job exist; schedule and complete visit; hold unit; approve cost sheet; create booking; attempt a second booking and get `409 UNIT_NOT_AVAILABLE`; record payment; confirm owner dashboard counts change.

---

## 48. Screen-By-Screen Build Specification

### 48.1 Builder Desk (`#/builder-desk`)

**Purpose:** the owner's morning control room. It answers: where are leads leaking, what should happen today, which sources/team members produce bookings, and what money is at risk.

**Layout:** top row has date/project filters and six fixed KPI cards: new leads, unassigned leads, first-response SLA breaches, visits today, bookings this month, overdue collections. Below it, use three unframed columns: `Needs attention` action queue, `Today and tomorrow` visits, and `Collections at risk`. Final row: source funnel, team activity table, inventory status, and AI owner briefing. Every number is clickable and opens a pre-filtered route.

**API:** `GET /analytics/builder-command?projectId&from&to&timezone`. Return precomputed aggregate data plus queue IDs, not a giant lead list. Add `/analytics/builder-command/refresh` owner-only if cached aggregates are used.

**Data:** `Lead`, `Task`, `SlaBreach`, `Booking`, `SiteVisit`, `Unit`, `PaymentSchedule`, `Receipt`, `ChannelPartner`, `IntegrationEvent`. Cache only aggregates for 60-300 seconds; urgent queues query fresh.

**Done when:** empty tenant shows setup progress, not zero-value charts; owner can reach every urgent record in one click; counts reconcile with the underlying filtered lists.

### 48.2 Work Queue (`#/work-queue`)

**Audience:** salesperson and manager. This replaces the habit of opening WhatsApp, a call app, Excel, and CRM separately.

**Panels:** `Do now` (SLA/overdue tasks), `Today` (calls/follow-ups/visits), `Waiting for buyer`, `Recently completed`. Each row shows buyer, project, stage, reason, last interaction, due countdown, and one primary action. Use icon actions for call, WhatsApp, complete, snooze; each opens a confirmation where necessary.

**API:** `GET /tasks/my-queue`, `PATCH /tasks/:id`, `POST /tasks/:id/snooze`. Do not let a user close an SLA task without a required outcome/reason.

### 48.3 Lead Inbox (`#/leads`)

**Layout:** data table with sticky filters, bulk action bar, and sortable columns: name, phone, source/campaign, project interest, score/segment, stage, owner, last contact, next action, created time. A manager-only `Unassigned` tab and `Leakage` tab must always be visible.

**Actions:** assign, reassign, merge candidate, change stage, send approved template, create task, add tag, export permitted fields. Bulk actions must log each affected ID and skip invalid records with a downloadable error report.

**API:** `GET /leads`, `POST /leads`, `PATCH /leads/:id`, `POST /leads/bulk`, `GET /leads/:id/duplicate-candidates`, `POST /leads/:id/merge`.

**Rules:** filter `deletedAt IS NULL`; use cursor pagination; do not allow direct status jump to booking/converted without a booking confirmation or a manager-provided legacy migration reason.

### 48.4 Lead Detail (`#/leads/:id`)

**Layout:** three panes on desktop and stacked sections on phone. Left is the activity timeline/chat. Centre is the current work card and pipeline. Right is a fixed buyer summary with project, budget, unit preference, ownership, score explanation, next task, consent, and quick actions. Keep quick actions at the top: Call, WhatsApp, Add note, Schedule visit, Send cost sheet.

**Tabs:** Activity, Details, Site visits, Units/cost sheets, Documents, Payments, Audit. Do not hide timeline events inside different modules.

**Required fields:** contact identity, source/campaign, project interest, budget band, BHK/type, location, move timeline, financing status, language, consent state, channel partner, stage, loss reason, next action. Treat custom fields as an extension, not a substitute for these standard fields.

**API:** `GET /leads/:id` returns a purpose-built DTO, not raw Prisma relations. Use mutations like `POST /leads/:id/notes`, `POST /leads/:id/tasks`, `POST /leads/:id/stage-transition` so server-side validation and timeline rules run.

### 48.5 Conversations and Calls (`#/messages`, `#/calls`)

**Conversation screen:** left thread list with unread/status/channel filters; centre message history; right buyer card and suggested next action. A message composer must show eligible templates, consent/channel state, variable preview, attachments, send/cancel, and delivery state. Free-form WhatsApp outbound text is allowed only within the provider's allowed customer-care window; otherwise force a valid approved template.

**Call screen:** show call direction, status, agent, duration, recording/transcript permission state, link to lead, summary, and follow-up. Clicking a phone button always creates a call intent/log before invoking provider/deep-link so the activity is traceable even if a device call fails.

**Provider handling:** each provider adapter implements `sendMessage`, `receiveWebhook`, `startCall`, `receiveCallWebhook`, `verifySignature`, and `normalisePayload`. Never put provider-specific code in controllers.

### 48.6 Site Visits (`#/site-visits`)

**Calendar and list:** show day/week/list modes. Each visit row has buyer, project/unit, owner, slot, status, confirmation state, last reminder, and outcome. Offer only valid statuses: `SCHEDULED`, `CONFIRMED`, `COMPLETED`, `NO_SHOW`, `RESCHEDULED`, `CANCELLED`.

**Create drawer:** buyer, project, optional unit, salesperson, date/time, meeting point/maps URL, attendee count, transport note, language, and confirmation channel. Validate salesperson working hours and overlapping assignments; manager may override with a reason.

**Check-in/outcome form:** completed time, buyer attended yes/no, GPS optional, units shown, objections (structured plus note), competitor mentioned, budget reconfirmed, buying timeline, next follow-up, follow-up owner. Completing/no-showing a visit must create the next task before the form can close.

**Models:** replace overloading `Booking` with a dedicated `SiteVisit` model. Keep legacy `Booking` data only for compatibility. `SiteVisit` fields: tenantId, leadId, projectId, unitId?, assignedAgentId, startAt, endAt?, status, confirmationAt?, checkedInAt?, checkedOutAt?, outcome JSON, noShowReason?, nextActionAt?, createdById, timestamps. Index tenant/status/startAt, leadId, assignedAgentId, projectId.

### 48.7 Projects and Inventory (`#/projects`, `#/projects/:id`, `#/inventory`)

**Project page:** project header shows name, RERA number, status, possession date, address/maps, brochure, banking details status, unit summary, and project-level material. Tabs: Overview, Inventory, Pricing, Documents, Visit settings, Reports, Settings.

**Inventory grid:** table and tower/floor grid views. Filters: project, tower, floor, unit type/BHK, facing, area, price, status, hold expiry. Unit colour must have text label too: available, on hold, booked, sold, blocked. Never rely on colour alone.

**Unit detail drawer:** unit number, tower/floor, areas, facing, base price and pricing components, current status, hold/booking owner, history, matching leads, shared documents, and allowed actions. The unit price shown to sales is the approved current version, not a manually editable value.

**Models to add:** `UnitHold` (not just fields on `Unit`) with id, tenantId, unitId, leadId, requestedById, approvedById?, status, expiresAt, releasedAt?, releaseReason?, metadata, timestamps. Add `version Int` to `Unit`; add `changedById` and `reason` to `UnitStatusHistory`.

**Atomic hold algorithm:** transaction: read unit where tenant/id; reject if status is BOOKED/SOLD/BLOCKED or active hold exists; update only where version matches; create hold and history; set `ON_HOLD`; enqueue expiry job with hold ID. Expiry job rechecks active status and expiresAt before releasing. Booking transaction locks/rechecks the same unit and marks the hold consumed.

### 48.8 Cost Sheets and Offers (`#/cost-sheets`, `#/offers`)

**Cost sheet builder:** start from a project price template, select unit and buyer, then render line items in order: base consideration, floor rise, PLC, parking, amenities/club, corpus, maintenance, statutory estimates, discount/scheme, net agreement value, booking amount, and payment plan. The template carries legal text/version; never hard-code tax percentages in the browser.

**Data model:** `CostSheet` with tenantId, leadId, unitId, projectId, status (`DRAFT`, `PENDING_APPROVAL`, `APPROVED`, `SENT`, `EXPIRED`, `SUPERSEDED`), currency, totalPaise, templateVersionId, snapshot JSON, createdById, approvedById?, expiresAt?, timestamps; `CostSheetLineItem` with code, label, calculation type, amountPaise, tax flags, displayOrder, metadata. Store a snapshot so later price changes cannot change an already-sent sheet.

**Offer policy:** `OfferRequest` references cost sheet and has requested discount paise/percentage, reason, proposed value, policy threshold, approver chain, status, expiry. Sales requests; manager approves within configured cap; owner approves beyond it. A rejected/expired offer cannot be sent as approved.

**PDF:** server generates an immutable PDF from the approved snapshot, saves it as a private media file, and records a document version. Browser PDF is preview-only. Add tests for every formula, rounding, negative amount rejection, and approved snapshot immutability.

### 48.9 Booking and KYC (`#/bookings/:id`)

**Booking wizard steps:** 1 Buyer and co-applicants; 2 Unit and approved cost sheet; 3 Booking payment; 4 Document checklist; 5 Review; 6 Confirm. Show progress and save draft. A booking cannot be confirmed by simply sending a UI `status=CONFIRMED` patch.

**Server confirmation conditions:** active unit hold belongs to this lead (or authorised manager override); unit is not booked/sold; selected cost sheet is approved and unexpired; buyer identity fields exist; booking payment has a recorded payment intent/receipt policy result; required document rules are satisfied or an authorised exception exists; permission passes. Execute all status changes atomically and make confirmation idempotent.

**Models:** extend `Booking` with `projectId`, `costSheetId`, `bookingNumber`, `bookingAmountPaise`, `confirmedById`, `confirmedAt`, `cancellationReason`, `version`; add `BookingApplicant` (bookingId, contactId or new applicant fields, role, PAN encrypted/reference, address snapshot); add `BookingStatusHistory`.

**Statuses:** `DRAFT`, `PENDING_APPROVAL`, `CONFIRMED`, `CANCELLED`, `REFUNDED`, `COMPLETED`. Do not reuse `NO_SHOW` for a booking; it belongs to a site visit.

### 48.10 KYC and documents

**KYC page layout:** top shows buyer/booking and a checklist by applicant. Each document row shows type, required/optional, received state, source, verification state, expiry, verifier, safe preview/download, and actions. Right panel shows `missing before booking`, `missing before agreement`, and `needs review`.

**Document states:** `NOT_REQUESTED`, `REQUESTED`, `UPLOADED`, `PROCESSING`, `VERIFIED`, `REJECTED`, `EXPIRED`, `WAIVED`. Rejection requires reason and optional re-upload request. A document is not automatically verified merely because it was uploaded.

**Models:** `KycCase` (tenant, booking, contact/applicant, status, policyVersion); `KycDocument` (case, type, status, mediaFileId, documentNumberEncrypted?, numberLast4?, source, issuedAt?, expiresAt?, verifiedAt?, verifierId?, rejectionReason?, verificationEvidence JSON); `DocumentShareLink` (token hash, allowed actions, expiresAt, maxUses, revokedAt). Encrypt document identifiers with a KMS-managed envelope key; display only masked identifiers.

**Buyer upload flow:** generate a one-time signed link scoped to one case and allowed document types; buyer sees no internal notes; server uploads privately, runs scan, writes `UPLOADED`, then queues review. Expire link in 7 days or after configured uses. A user must be able to revoke a link immediately.

**DigiLocker / Aadhaar decision:**

- Phase 1: accept PAN, passport, voter ID, driving licence, and Aadhaar offline XML/PDF/secure QR through the buyer link or staff upload. Verify with human review plus explicit evidence.
- Do **not** ask the buyer to enter an Aadhaar number into the CRM and do not implement biometric or Aadhaar OTP authentication yourself. That requires a properly authorised UIDAI ecosystem integration and is not a normal SaaS API.
- For Aadhaar Paperless Offline e-KYC, let the buyer supply a UIDAI-generated ZIP plus share code through a one-time secure form. A short-lived backend worker decrypts in memory, validates the XML digital signature against the current UIDAI offline public certificate, extracts permitted data, stores only the masked reference/verification result and permitted profile fields, then deletes the ZIP/share code from worker storage. Never retain or display the share code. UIDAI describes this as consented, holder-driven offline verification and prohibits sharing/publishing the XML or contents. See [UIDAI offline e-KYC guidance](https://uidai.gov.in/en/contact-support/have-any-question/307-faqs/aadhaar-online-services/aadhaar-paperless-offline-e-kyc.html) and [current public certificates](https://www.uidai.gov.in/en/914-developer-section.html).
- DigiLocker Phase 2: register the builder/company as a verified **Requester** through the official DigiLocker partner process; obtain production credentials only after approval. Implement OAuth-style redirect/callback server-side with PKCE, explicit buyer consent and a purpose statement, state/nonce validation, short-lived encrypted tokens, a document-selection step, encrypted fetch, verification evidence, and revocation/retention policy. Do not label a document `DigiLocker verified` unless the official integration response and document issuer metadata support it. Add a manual fallback for every DigiLocker failure.
- Add a `ConsentRecord` for every KYC/DigiLocker action: purpose, document types, policy version, timestamp, IP/device metadata, link to source, withdrawal time. Withdrawal stops future use but does not silently destroy legally required booking records; surface the retention policy to the tenant.

### 48.11 Collections: schedules, demand letters, receipts, ledger (`#/collections`)

**Collection screen:** tabs: Due today, Upcoming, Overdue, Reconciliation, Demand letters, Receipts, Buyer ledger. Filters include project, milestone, owner, status, date, and amount band. An overdue card links to the precise schedule rows.

**Payment schedule:** create from an approved payment-plan template at booking confirmation. Each installment has milestone code, label, due date/trigger, amount paise, status, waived amount, reminders, and linked demand letters/payments. Never mutate paid historical rows; create adjustments/credit notes with a reason.

**Demand letter:** generated only from a due/approved schedule. It must snapshot buyer/unit/builder bank details, amount, due date, payment instructions, project RERA details, and template version. Generate server-side PDF, track every email/WhatsApp send and delivery. Marking it sent must not mark the installment paid.

**Payment/receipt:** record payment as `PaymentReceipt` with external provider ID or bank reference, received amount paise, received date, mode, allocation(s), status (`PENDING_RECONCILIATION`, `CONFIRMED`, `REVERSED`, `FAILED`), and attachment. One payment can allocate to multiple schedules. Only collections/admin can confirm or reverse it; reversal creates a ledger entry and audit record.

**Buyer ledger:** append-only entries for debit, credit, payment, waiver, reversal, refund. Current balance is computed from entries, not manually typed. Test allocation, partial payment, overpayment, reversal, and duplicate provider webhook behavior.

### 48.12 Channel Partners (`#/channel-partners`, `#/partner-portal`)

**Internal page:** partner profile, company/RERA details, contacts, projects allowed, terms/commission plan, document checklist, lead registration history, visit/bookings, payout ledger, and status. Partner status cannot become active until mandatory onboarding checks pass.

**Partner portal:** separate auth/session scope and routes. It permits project collateral, available-unit summary (only fields allowed by project policy), lead registration, registered-lead status, visit requests, and commission statements. It must never expose other leads, internal notes, raw cost-sheet formulas, buyer documents, or hidden units.

**Registration flow:** partner enters phone first; backend normalizes and checks existing contact/lead/active partner claim. Response must be neutral to the partner: `registered`, `already registered`, or `needs review`; never leak another partner's name. Apply configured lock window by project/source. Manager resolves disputes with evidence and creates an immutable `PartnerLeadClaim` decision.

**Models:** `PartnerPortalUser`, `PartnerLeadClaim`, `CommissionPlan`, `CommissionAccrual`, `CommissionPayout`. Commission is accrued on a configured booking/payment event and paid only after finance approval. Store the policy snapshot on every accrual.

### 48.13 Marketing, portal connectors, and attribution (`#/sources`)

**Connector page:** one card per source: connection status, last successful event, last failed event, last lead, 7-day count, field mapping, test payload button, reconnect button, and error action. Do not imply an integration exists until it has actually passed a live test.

**Ingestion design:** `ProviderAdapter` normalizes provider payload to `NormalizedLeadInput`; the canonical fields are source, externalLeadId, receivedAt, name, phone, email, message, project, campaign/UTM, consent signals, raw metadata. Save raw/redacted payload and mapping version in `IntegrationEvent`. Verify provider signatures/secrets before parsing when the provider supports them. Return quickly, enqueue slow work.

**Attribution:** preserve immutable first-touch, last-touch, and every touch in `LeadAttributionTouch`. Do not overwrite lead source when a WhatsApp conversation happens later. Reports must label attribution model and date window. Spend imports are separate from leads and require project/campaign/date/currency.

### 48.14 Reports (`#/reports`)

Build the following report definitions before inventing a free-form BI tool: lead source funnel, response/SLA, salesperson activity, visit funnel, unit availability/velocity, booking funnel, collections ageing, channel partner funnel, campaign ROI, and loss reasons.

Every report must show: date range, timezone, filters, exact definition, last refresh time, no-data state, drill-down link, export permission, and data-quality warning when connector health is failing. `Cost per booking` is spend / confirmed bookings under the chosen attribution model; no report may claim ROI if spend or booking value is missing.

---

## 49. Backend API And Data Contract

### 49.1 Add modules and endpoints

Create narrowly owned modules, rather than a giant `real-estate` controller:

| Module | Endpoints | Main responsibility |
| --- | --- | --- |
| `site-visits` | CRUD, confirm, check-in, complete, no-show, reschedule | visit lifecycle/reminders/outcomes |
| `unit-holds` | create, extend, release | concurrent-safe inventory reservation |
| `cost-sheets` | CRUD, calculate, submit, approve, PDF/send | versioned pricing and approval |
| `offers` | create, approve, reject, expire | discount governance |
| `kyc` | cases, upload link, documents, review, verify/reject | private document lifecycle |
| `digilocker` | start, callback, document import, revoke | consented Phase 2 integration |
| `collections` | plans, letters, payments, receipts, ledger | money movement records |
| `partner-portal` | auth, project feed, lead claim, statement | restricted external portal |
| `source-health` | source status, replay-safe failure review | external ingestion observability |

Use `/v1/` versioning for new public and portal endpoints. Controllers only authenticate/validate/authorize and call services. Services own transaction boundaries. Workers own delayed jobs. Every response has a typed DTO; never return `password`, encrypted fields, raw provider payload, unmasked KYC, or unapproved internal notes.

### 49.2 Event names and jobs

Publish domain events after the transaction commits: `lead.created`, `lead.assigned`, `lead.sla_breached`, `visit.scheduled`, `visit.completed`, `unit.hold_created`, `unit.hold_expired`, `cost_sheet.approved`, `booking.confirmed`, `document.uploaded`, `document.verified`, `payment.due`, `payment.received`, `payment.overdue`, `partner.claim_created`. Consumers must be idempotent by event ID.

BullMQ queues: `lead-intake`, `message-delivery`, `sla-monitor`, `visit-reminders`, `hold-expiry`, `document-processing`, `demand-letters`, `payment-reminders`, `report-aggregates`, `ai-assist`. Every job needs attempts/backoff, dead-letter visibility, correlation ID, and a human-readable failure action.

### 49.3 Database migrations

1. Add enums/models with nullable foreign keys where legacy data needs backfill.
2. Write a Prisma migration and a backfill script that maps existing `Booking` visits only after checking semantics; do not automatically relabel historical booking payments as visits.
3. Add indexes before enabling report/queue pages: `(tenantId, status, createdAt)`, `(tenantId, assignedAgentId, updatedAt)`, `(tenantId, projectId, status)`, `(tenantId, dueDate, status)`.
4. Backfill in batches, log counts/errors, validate read-only reports, then enforce non-null constraints in a later migration.
5. Include rollback notes in every migration. A failed external integration must not require rolling back core data.

### 49.4 API error format

Use `{ code, message, details?, requestId }`. Required codes include `VALIDATION_ERROR`, `FORBIDDEN`, `NOT_FOUND`, `DUPLICATE_EVENT`, `DUPLICATE_LEAD_REVIEW_REQUIRED`, `UNIT_NOT_AVAILABLE`, `HOLD_EXPIRED`, `APPROVAL_REQUIRED`, `DOCUMENTS_INCOMPLETE`, `CONSENT_REQUIRED`, `PROVIDER_UNAVAILABLE`, and `CONFLICT`. The frontend maps known codes to clear user actions and logs the request ID for support.

---

## 50. Automation And AI Contract

### 50.1 Safe automation defaults

- New paid portal lead: create acknowledgement draft/job, first-response task, SLA timer, and manager escalation after configured delay.
- No response after a call: create a follow-up task, do not repeatedly message without consent/channel policy.
- Visit scheduled: buyer confirmation, 24-hour and 2-hour reminders, salesperson briefing, manager alert for unconfirmed visit.
- No-show: send one approved reschedule template and create a human task; stop after configured attempts.
- Hold nearing expiry: notify salesperson, then manager; automatic release only after policy time and recheck.
- Payment due/overdue: use approved legal/finance templates, escalation schedule, and opt-out/communication rules.

Every automation must store: policy version, trigger event, planned action, actual action, execution status, provider result, retry count, suppression reason, and undo/cancel mechanism when meaningful.

### 50.2 AI: assist first, never silently decide money or identity

AI may create: lead summary, call summary, message draft, next-action suggestion, visit brief, objection summary, lost-reason clustering, owner daily digest. It may not autonomously approve discounts, change unit status, book a unit, alter payment records, verify KYC, send a legally binding letter, or message a buyer without configured automation approval.

Each AI output stores model, prompt-template version, source record IDs, created time, confidence/limitations, user edit/accept/reject outcome. Redact Aadhaar/PAN/bank values and document contents before prompt creation. The UI labels every AI result `Draft - review before use`; show sources/inputs so the salesperson can correct it.

### 50.3 AI quality tests

Create a fixed test set of realistic but synthetic lead conversations in English, Hindi, Telugu, Marathi, and mixed English. Assert: no invented price/availability; no promise of a discount; no legal/loan guarantee; no disclosure of another buyer; no sensitive identifiers; clear escalation when information is missing. Track acceptance rate, edit rate, policy failure rate, and response latency per tenant without training on customer data by default.

---

## 51. Security, Compliance, And Operations Checklist

- Use HTTPS everywhere, encrypted database/storage, secrets manager, and environment-specific keys.
- Add tenant isolation tests for every new repository/service query.
- Add field-level redaction for audit logs, exceptions, support views, and analytics.
- Require MFA for owner/admin; use invite links with expiry; revoke sessions when a user is disabled.
- Record explicit marketing consent separately by channel and source. An opt-out immediately suppresses non-essential sends for that channel.
- Add configurable retention and deletion workflow. Preserve legally required booking/finance records according to the builder's policy; do not promise automatic deletion without defining it.
- Add daily encrypted database backups, restore drills, file-storage backup/versioning, queue monitoring, webhook failure alerts, and audit-log retention.
- Add rate limits and CAPTCHA/abuse protection to public lead forms and buyer/partner links.
- Add webhook signature verification and secret rotation for every provider that supports it.
- Treat RERA/legal/tax content as tenant-owned approved templates. Display project RERA number in property-specific material from the project record and block sends when a configured mandatory value is missing.
- Before production rollout, obtain Indian legal/compliance review for DPDP, Aadhaar/DigiLocker use, tax wording, payment collection, and state-specific RERA requirements. This software can enforce process; it must not pretend to provide legal verification.

---

## 52. Test Plan: What “Built” Means

### Unit tests

- phone normalization, source mapping, duplicate scoring, routing rule evaluation, SLA deadline calculation, payment-plan calculation, cost-sheet line calculations, currency rounding, status transition guards, consent suppression, template variable validation, and signed-link expiry.

### Service/integration tests

- provider webhook signature + idempotency; duplicate lead merge/link; assignment fallback; delayed SLA escalation; WhatsApp delivery webhook update; visit reminder cancellation on cancellation; unit-hold race; booking transaction race; cost-sheet approval snapshot; document access isolation; partner duplicate lock; partial/reversed payment allocation; report aggregate reconciliation.

### Browser tests

- salesperson works a new lead to visit on mobile viewport; manager resolves unassigned lead; owner drills down from dashboard; unit cannot be double-booked; buyer uploads a document through a restricted link; partner cannot read another partner's lead; error/retry state for a failed portal connector.

### Release gates

- `backend`: Prisma generate, migration on a fresh database, unit and integration test suites pass.
- `dashboard-v2`: TypeScript lint, tests, production build pass.
- E2E: one full happy path and one failure path pass against a disposable seeded environment.
- Security: authenticated tenant A cannot read, mutate, download, or search tenant B data; KYC URLs expire and cannot be enumerated.
- Operations: failed job, provider timeout, and duplicate webhook appear in the Integration Health UI with a safe retry path.

---

## 53. Build Order For Another IDE Agent

Do not try to build 50 screens at once. Complete these milestones in order, each on a feature branch with migration/tests/UI/API merged together.

1. **Foundation (week 1):** tenant capability checks, audit helper, timeline helper, integration event/idempotency store, money type, common status-transition helper, queue observability.
2. **Lead revenue desk (weeks 1-2):** Builder Desk, Work Queue, Lead Inbox/Detail hardening, dedupe, assignment, SLA, source health.
3. **Communication (week 3):** message/call adapters, unified timeline, template eligibility, delivery status, mobile quick actions.
4. **Site visits (week 4):** dedicated visit model/page/reminders/outcomes and visit funnel report.
5. **Inventory (weeks 5-6):** project/tower/unit import validation, availability grid, unit status history, concurrency-safe holds.
6. **Money before paperwork (weeks 7-8):** cost sheets, offer approvals, booking wizard, payment-plan generation.
7. **Documents and collections (weeks 9-10):** KYC case/documents/manual verification, demand letters, receipts, ledger, overdue queue. Implement DigiLocker only after manual KYC is secure and legally reviewed.
8. **External portals (weeks 11-12):** channel-partner portal/claims/commission, buyer portal, hard permission tests.
9. **AI and polish (ongoing):** draft-only AI assists, daily digest, quality evaluation, pilot onboarding/import tooling.

For every milestone, provide a demo seed tenant, a 10-minute script, migration guide, support runbook, and rollback plan. No milestone is “done” merely because its page renders.

---

## 54. Remaining Product Areas: Exact Minimum Build

### 54.1 Buyer portal (`/buyer/:token` or authenticated `/portal`)

Build this after booking/collections, not before. The buyer sees a clean, mobile-first view of only their booking(s): project/unit summary, approved documents, payment schedule, receipts, demand letters, document upload requests, support request, and contact details. They cannot see internal prices, other applicants, sales notes, commission, or unapproved documents.

Use passwordless OTP to the booking's verified phone/email or a short-lived magic link. A token must be hashed at rest, single purpose, rate limited, expired, revocable, and bound to the buyer/contact. The portal fetches data through a `BuyerPortalService` that checks booking/contact ownership on every request; never expose internal APIs directly. A buyer-uploaded document starts in `UPLOADED`, not `VERIFIED`. Add an audit event for every portal login, file download, upload, and support request.

### 54.2 Onboarding wizard (`#/onboarding`)

The owner must be able to reach a useful first day without reading documentation. The wizard has these ordered steps: company and timezone; owner/admin; projects and RERA/bank data; team; inventory import; lead stages/routing; WhatsApp/call integrations; lead sources; templates; test lead; invite team; go-live check.

Each step has `not started`, `in progress`, `blocked`, or `complete`, with an explicit validator. For example, inventory is complete only if every imported unit has unique project/unit number and valid status; WhatsApp is complete only after a verified test send; portal connector is complete only after receiving a valid test payload. Store progress in `Tenant.settings.onboarding` or a `TenantOnboardingStep` model with actor/timestamp so support can see exactly where a customer is stuck.

### 54.3 Imports and migration from Excel/other CRM (`#/import`)

Every import is a three-stage job: upload -> map/validate -> commit. Never write rows while the user is still mapping columns. The preview must show row count, required-field errors, duplicates, unit conflicts, sample normalized values, and rows that will update versus create.

Support import types: leads/contacts, projects/towers/units, team, channel partners, payment schedules, historical bookings, and call/WhatsApp history where permitted. Use one `ImportJob` and `ImportRowError` model with tenantId, actor, source file checksum, mapping JSON, status, created/updated/skipped/error counts, downloadable errors, and rollback reference. Commit in idempotent batches; allow rollback only for the records created by that import and only before later user edits depend on them. Treat an Excel inventory import as `DRAFT` until a manager publishes it.

### 54.4 Mobile/PWA requirements

Salespeople must be able to complete lead, call-note, WhatsApp, and visit workflows with one hand on a slow connection. Build responsive pages first; only then add installability/service worker. The mobile bottom navigation is Work Queue, Leads, Visits, Inventory, More. Use large touch targets, sticky primary action, camera upload, and network-aware retry queue for non-financial drafts.

Never queue irreversible actions offline: booking confirmation, payment confirmation, unit hold, approval, or KYC verification must hit the server and show the final server result. For queued notes/check-in drafts, show `pending sync`, retry safely with an idempotency key, and let the user discard the draft. Test at 360px width and with simulated offline/slow network.

### 54.5 Settings and policy configuration (`#/settings`)

Organize settings as safe, named policies rather than a giant JSON form:

- Company: legal name, logo, timezone, currency, support contacts.
- Projects: RERA number, bank/payment instructions, mandatory material, visit rules.
- Sales: stages, required stage fields, score thresholds, working hours, routing capacity.
- SLA: first response targets by source/priority, escalation chain, holiday calendar.
- Inventory: hold duration, extension authority, block reasons, booking rules.
- Pricing: cost-sheet templates, approval caps, tax/legal copy version, expiry rules.
- Communication: sender numbers, templates, quiet hours, consent/opt-out policy.
- KYC: document policy by booking type, reviewer roles, retention, buyer-link expiry.
- Collections: payment plans, reminder cadence, receipt numbering, bank references.
- Partner: registration lock period, visible projects/units, commission plans.
- Integrations: credentials/secrets, test/reconnect, field mapping, webhook logs.

All policy changes need effective time, actor, optional approval, and audit history. Do not silently apply a changed policy retroactively to approved cost sheets, bookings, holds, or documents; snapshot the relevant policy when the record is created.

### 54.6 Source-specific implementation policy

Build a connector only when the source gives the builder a legitimate API/webhook, email forwarding feed, or approved export path. Do not scrape portal credentials or browser pages. For each connector, write a provider runbook containing: required account/permissions, credentials/secrets, webhook URL/signature, sample payload, field mapping, idempotency key, retry behavior, test procedure, known limits, support escalation, and disconnect procedure.

For sources without a suitable API, provide an inbound email parser or CSV import with clear attribution, not an unofficial automation. Every connector must use a feature flag until a tenant completes a real test event.

### 54.7 Definition of “Sell.Do parity” in this product

Parity is measured by a complete working flow, not a matching menu label. The minimum parity map is:

| Capability | Our proof that it exists |
| --- | --- |
| Lead management and routing | a portal lead reaches one accountable agent with task/SLA/audit |
| Pre-sales and calls | call/message history and follow-up in the same lead timeline |
| Site visits | schedule -> confirm -> attend/no-show -> follow-up -> funnel report |
| Inventory | one trusted project/tower/unit status with concurrent booking protection |
| Cost sheet/negotiation | versioned calculation, approvals, immutable sent PDF |
| Booking/post-sales | approved booking changes inventory and creates KYC/collection work |
| Collections | demand -> receipt -> allocation -> buyer ledger without duplicate payments |
| Channel partners | restricted registration/status/commission flow with duplicate claim policy |
| Portals | authenticated buyer sees only verified data and documents |
| Analytics | owner can drill from every KPI to source records and reconcile counts |
| AI | reviewed drafts save time without taking money, legal, identity, or messaging decisions silently |

Anything outside this map is a later enhancement until the pilot has proven that this loop raises response speed, site visits, bookings, or collections.

---

## 55. Production Build Directive For The Implementing IDE

### 55.1 The most important instruction

**Do not attempt to build this entire document in one pass.** This is a product specification, not one coding task. Build one numbered milestone from Section 53 at a time. For each milestone, the IDE must first create a small execution plan in `docs/superpowers/plans/YYYY-MM-DD-<milestone>.md`, implement it, run every required test, inspect failures, and only then begin the next milestone.

Never replace working existing code just because a new module seems cleaner. Extend the current NestJS, Prisma, React, BullMQ, and agent-service architecture. Preserve tenant isolation, existing public API behavior, and existing user data.

### 55.2 The “explain it to a child” build loop

For **every single feature**, follow this exact loop:

1. Say what one user presses. Example: “Salesperson presses `Schedule visit` on Ravi's lead.”
2. Say what must happen next. Example: “A visit is saved, Ravi receives confirmation, and the salesperson gets a reminder.”
3. List the database records that change and the exact allowed starting/ending status.
4. Write a failing test that proves this one promise.
5. Add the Prisma migration if new stored data is needed. Run it on a blank database and an existing-data copy.
6. Build the backend validation, permission check, transaction, timeline event, audit event, and job enqueue.
7. Build the screen with loading, empty, success, validation-error, network-error, and permission-denied states.
8. Make the test pass. Add one failure test: wrong role, duplicate event, expired link, bad status, or provider timeout.
9. Run the real browser flow on desktop and a 360px mobile viewport.
10. Commit only when the code, migration, tests, and UI all agree on the same behavior.

If the IDE cannot state steps 1-3 in simple words, it must stop and clarify the design before writing code.

### 55.3 Never-guess rules

The implementing IDE must stop and mark an item `BLOCKED_EXTERNAL_DECISION` instead of inventing an answer when any of the following is unknown:

- A portal, WhatsApp, telephony, DigiLocker, payment, or SMS provider's official API, account eligibility, webhook signature, price, or production credential.
- A tax, GST, stamp-duty, RERA, legal-letter, payment, retention, DPDP, Aadhaar, or KYC rule.
- A tenant's approved bank details, cost-sheet components, discount policy, commission terms, stages, template wording, or document policy.
- An ambiguous historical import column or record that could change a booking, payment, or inventory status.

Use `manual review required` as the safe default. Never fake a successful provider callback, KYC verification, payment, booking, PDF signature, delivery receipt, or integration connection in production.

### 55.4 Non-negotiable invariants

These statements must always remain true. Write automated tests for each one before the associated feature is released.

1. A user from tenant A cannot read, search, download, edit, or infer tenant B's data.
2. A unit cannot be simultaneously available for two confirmed bookings.
3. A duplicate provider webhook cannot create duplicate business records or duplicate messages.
4. A user cannot approve their own restricted discount/exception unless the policy explicitly permits it.
5. A booked/sold unit cannot become available without an authorised cancellation/release workflow and audit reason.
6. A payment receipt cannot be silently changed or deleted after confirmation; it can only be reversed with a new ledger/audit record.
7. An unverified document is never displayed as verified.
8. A buyer/partner magic link cannot access any record beyond its explicit scope and expiry.
9. An opted-out contact does not receive non-essential marketing messages on that channel.
10. An AI output cannot change money, identity, inventory, or buyer communication without a human-approved product policy and audit trail.
11. A report's displayed total can be traced to the records included in that exact filter/date/timezone definition.
12. A failed job, webhook, or provider request becomes visible to a human with a safe retry or resolution path.

### 55.5 Required environments

Maintain four environments with separate credentials and databases: `local`, `test`, `staging`, and `production`. Production data is never copied to local/test without anonymisation and documented approval. Staging has sandbox providers wherever available and a seeded demo tenant containing synthetic people, phone numbers, payments, and documents.

Required environment variables are documented in `.env.example` without secrets. Add validation at backend boot: fail fast when required production secrets, encryption keys, database URL, storage configuration, queue URL, or trusted webhook configuration are missing. A feature must remain disabled rather than partially running when its provider configuration is absent.

### 55.6 Definition of done for one feature

A feature is not done when its page looks correct. It is done only when all items below are checked:

- [ ] User story and acceptance criteria are written.
- [ ] Exact role/capability rules are written and tested.
- [ ] Prisma migration has applied on a blank and representative existing database.
- [ ] Backend DTO validation, tenant filter, status transitions, and audit/timeline events are implemented.
- [ ] External calls run through an idempotent job/adapter with timeout, retry, and visible failure state.
- [ ] Desktop and mobile screen handle loading, no data, bad input, no permission, slow network, and server error.
- [ ] Unit, service, and browser tests cover success plus the most harmful failure case.
- [ ] Logs redact personal/KYC/bank secrets; error responses expose no internal data.
- [ ] Reports/notifications/automation were updated where this feature affects them.
- [ ] Rollback plan and support action are documented.
- [ ] Code review has checked race conditions, authorization, money calculations, and data migration risk.

### 55.7 Release gate: a customer may use it only after this

Before enabling a module for a real builder, run a release candidate in staging using a synthetic 25-person builder scenario. Execute the full story in Section 47, then deliberately fail each external dependency: duplicate portal webhook, slow database, WhatsApp API error, call-provider retry, expired hold, duplicate booking click, expired buyer link, invalid document, payment-provider retry, and wrong-tenant request.

Release only when the product preserves data correctly, tells a human what failed, gives a safe recovery path, and does not show an incorrect success state. Start each module behind a tenant feature flag. Pilot with one builder, observe production logs/metrics daily, and roll out only after the pilot meets Section 44's success criteria.

### 55.8 Honest reliability promise

No software team can truthfully promise that “nothing can ever break.” The production promise must be stronger and more useful: **nothing important fails silently; data is protected; money, inventory, KYC, and messages are safe by default; failures are detected early; and every critical operation can be traced and recovered.**

---

## 56. Jarvis: The Proactive Builder Operating Agent

### 56.1 What Jarvis is

Jarvis is not a chatbot placed beside the CRM. Jarvis is the always-on operating layer that watches the complete builder workflow, finds revenue leaks/opportunities, decides the safest next action, performs authorised routine work, asks for approval on meaningful actions, and learns from measured outcomes.

The owner should be able to ask:

- “What is slipping today?”
- “Get every hot lead a response before lunch.”
- “Why are our 99acres visits not becoming bookings?”
- “Recover this week's no-shows.”
- “Prepare every overdue payment follow-up for approval.”
- “Make the team follow up properly, but do not change discounts or send anything risky.”

Jarvis answers with evidence, performs only allowed work, and reports what changed. It must never pretend a human task, provider action, or buyer response happened when it did not.

### 56.2 Jarvis's daily loop

Run the loop continuously through domain events plus scheduled scans. Do not rely only on a user opening a dashboard.

1. **Observe:** consume lead, message, call, visit, unit, booking, payment, provider-health, task, and user-activity events.
2. **Understand:** build a small factual state for the affected tenant/project/lead. Query the database for current truth; use AI only to summarize or reason over permitted facts.
3. **Detect:** find a concrete issue/opportunity such as untouched paid lead, missed-call recovery, unconfirmed visit, expiring hold, poor source quality, missing booking document, overdue collection, partner dispute, or team capacity imbalance.
4. **Decide:** choose from an allow-listed action playbook. The decision includes reason, evidence, expected outcome, risk level, policy version, and an undo plan.
5. **Act or request approval:** execute only if current tenant policy and authority level allow it. Otherwise create a visible approval card/task with one-click approve/reject/edit.
6. **Verify:** read the provider/database result after action. For example, wait for WhatsApp delivery event; do not call a message “sent” just because a job was created.
7. **Learn:** after a measurable window, compare expected and real outcome. Record whether the action helped, harmed, or had insufficient evidence. Propose a policy change; never silently change high-impact policy.
8. **Explain:** write a human-readable timeline/audit entry: what Jarvis noticed, why it acted, what it did, result, and how to undo/escalate.

### 56.3 Jarvis personas, all sharing one factual core

Do not create independent agents that contradict each other. Use a single tenant-scoped factual context and policy engine, with specialised workers:

| Worker | Input | Allowed output |
| --- | --- | --- |
| Lead guardian | new/stale/hot lead events | task, routing suggestion, approved acknowledgement, escalation |
| Conversation coach | messages/calls/transcripts | summary, reply draft, objection/next-step suggestion |
| Visit guardian | visit schedule/status | reminders, confirmation chase, briefing, no-show recovery task |
| Inventory guardian | unit/hold/booking events | expiry notice, hold release only when policy permits, conflict alert |
| Collections guardian | due/overdue/payment events | draft demand/reminder, reconciliation exception, escalation task |
| Source analyst | attribution/spend/funnel events | source anomaly finding, report, recommendation, never automatic ad spend change |
| Team coach | work queue/activity/SLA events | workload suggestion, manager alert, coaching brief |
| Owner chief of staff | all approved findings | morning/evening digest, prioritized decisions, risk summary |
| Reliability sentinel | health/jobs/webhooks/queues | incident finding, safe retry, feature disable recommendation, on-call alert |

Workers may share facts through the database/event records and approved bounded memory. They must not share raw KYC, PAN, Aadhaar, bank account data, secrets, or one tenant's facts with another tenant.

### 56.4 Authority levels: the owner controls Jarvis

Every tenant chooses a level per action category, not one dangerous global “autonomous” switch.

| Level | Jarvis does | Example |
| --- | --- | --- |
| 0: Off | nothing | no scan/action except system health |
| 1: Observe | detects and reports | “7 hot leads are untouched” |
| 2: Draft | prepares work for a human | draft WhatsApp reply and follow-up plan |
| 3: Approval required | queues a fully explained action | manager approves a reassignment or template send |
| 4: Guardrailed autonomous | performs pre-approved, reversible, low-risk playbook actions | creates follow-up task, sends a pre-approved acknowledgement, retries a failed non-financial job |

Start every new tenant/action at Level 1 or 2. Promote one playbook only after shadow-mode evidence and owner approval. An owner can pause a category or all Jarvis actions immediately; the pause takes effect before the next job begins.

**Always human-only:** unit booking/sale/cancellation, payment confirmation/reversal/refund, price/discount/offer approval, KYC verification or rejection, legally binding demand letters/agreement, changing bank details, external ad-budget changes, deletion of business records, and policy changes that affect compliance/money.

### 56.5 The Jarvis command centre (`#/jarvis`)

Build a real command centre, not just a chat page.

**Top strip:** Jarvis status (`watching`, `shadow`, `approval`, `autonomous paused`), kill switch, last scan, unresolved critical issues, jobs failed, and tenant action budget today.

**Tabs:**

- `Today`: ranked findings, what Jarvis already did, what needs approval, and expected impact.
- `Approvals`: each card has evidence, affected records, proposed action, risks, policy, expiry, preview, approve/edit/reject/always allow controls.
- `Actions`: immutable action history with provider/database result, retry/undo where possible, and links to records.
- `Learning`: outcomes by playbook, acceptance rate, false-positive rate, control group comparison, proposed policy/rule changes awaiting approval.
- `Policies`: action categories, authority level, quiet hours, send limits, escalation contacts, exclusion lists, required approvers, kill switches.
- `Reliability`: service health, connector health, scheduled scan freshness, queue depth, dead jobs, synthetic-test results, incident history.

Chat is an additional input method. A Jarvis chat answer must cite the record counts/links it used and create an explicit planned action before it makes a change.

### 56.6 Action contract: no free-form tool use

Jarvis never receives broad database write access or arbitrary HTTP access. It may call narrowly scoped backend tools only. Each tool has a JSON schema, policy category, permission check, tenant scope, idempotency key, rate limit, and audit outcome.

Initial safe tools:

- `create_followup_task(leadId, dueAt, reason, assigneeId?)`
- `create_manager_alert(entityId, severity, evidence)`
- `prepare_message_draft(leadId, templateId?, text, reason)`
- `send_approved_template(leadId, templateId, variables, idempotencyKey)` only when consent, quiet hours, template eligibility, and tenant policy pass
- `suggest_reassignment(leadId, suggestedAgentId, evidence)`
- `request_visit_confirmation(visitId)` only from an approved template and capped attempts
- `release_expired_hold(holdId, idempotencyKey)` only when the hold is confirmed expired and policy permits
- `retry_failed_delivery(actionId)` only if the provider says the first request did not succeed
- `create_approval_request(type, entityId, proposal, evidence)`

Each tool returns structured result states: `COMPLETED`, `NO_OP`, `BLOCKED_BY_POLICY`, `REQUIRES_APPROVAL`, `PROVIDER_PENDING`, `FAILED_RETRYABLE`, `FAILED_FINAL`. Jarvis must report these exact states; it may not convert a failure into reassuring prose.

### 56.7 Data model for Jarvis

Add these tenant-scoped Prisma models, preferably under the existing `mikey` module and with migrations/tests:

- `JarvisFinding`: type, severity, entity references, evidence JSON, confidence, recommendation, status (`OPEN`, `ACKNOWLEDGED`, `SUPPRESSED`, `RESOLVED`, `EXPIRED`), detectedAt, expiresAt.
- `JarvisPlaybook`: name, category, trigger definition, preconditions, action schema, authority level, cooldown, daily cap, risk level, active, policy version.
- `JarvisAction`: findingId?, playbookId?, request ID, action name/input redacted, status, plannedAt, executedAt, verifiedAt, result JSON redacted, error, undo data encrypted?, idempotency key, actor (`jarvis`/user), approvedById?, policy snapshot.
- `JarvisApproval`: actionId, requestedBy, required role, status, decision reason, expiresAt, decidedBy, timestamps.
- `JarvisOutcome`: actionId, metric name, baseline value, observation window, result value, control/comparison key, verdict (`HELPED`, `HARMED`, `INCONCLUSIVE`), reviewedBy?.
- `JarvisPolicy`: tenantId, category, authority level, quiet hours, caps, excluded records/users, escalation configuration, version, updatedBy.
- `SyntheticJourneyRun`: environment, scenario name, run ID, status, started/finished, failed step, evidence URLs/IDs, cleanup status. Production synthetic data must be clearly tagged and excluded from normal reports.

Index `tenantId, status, createdAt` for findings/actions and make `JarvisAction.idempotencyKey` unique per tenant/playbook/event so scheduled scans cannot repeat an action.

### 56.8 Decision quality rules

- Factual retrieval comes from the application database/services. An LLM is never the source of truth for unit availability, payment state, consent, role, or policy.
- A finding must contain at least one concrete evidence item: record ID, timestamp, threshold, and observed value.
- If facts are missing or contradictory, Jarvis creates a review task rather than guessing.
- Confidence is not permission. A high-confidence model cannot bypass a policy, role, approval, send cap, or invariant.
- Every repeated action gets a cooldown and a per-lead/per-contact daily limit.
- Use deterministic rules first for safety-critical detection (SLA, hold expiry, overdue payment); use AI for summarization/ranking/drafts.
- Learning can recommend a new routing/score/message rule, but it starts as `PENDING_APPROVAL` with evidence and an expected impact. It never self-deploys to all tenants.

---

## 57. Jarvis Playbooks: What It Actually Does

### 57.1 Untouched paid lead recovery

**Trigger:** paid-source lead has no completed call/message inside configured first-response target.

**Jarvis checks:** lead not lost/spam/converted; assigned agent status; consent; business hours; previous actions; source/project SLA; manager escalation policy.

**Action at Level 2:** create a task and message draft; notify salesperson/manager with the exact delay.

**Action at Level 4:** send one approved acknowledgement template only if consent and quiet-hour policy pass, create task, then escalate to manager after the configured delay. It never invents price, unit availability, or a visit slot.

**Success metric:** first response completed before SLA and eventual contact/visit rate. **Stop condition:** buyer opt-out, reply, lost/spam state, manual suppression, send cap, or provider failure.

### 57.2 Site-visit no-show prevention and recovery

**Trigger:** visit unconfirmed at 24 hours/2 hours, or marked no-show.

**Action:** prepare/send approved confirmation/reminder with maps link; brief salesperson with buyer context; on no-show create a reschedule task and one approved reschedule draft. Do not repeatedly pursue a buyer after configured attempts.

**Success metric:** confirmation rate, attendance rate, successful reschedule rate. **Safety:** no WhatsApp during quiet hours, no repeated messages if buyer declines/cancels.

### 57.3 Inventory hold guardian

**Trigger:** hold reaches warning time or expiry.

**Action:** notify owning salesperson and manager; at authorised Level 4 release only a hold whose expiry is in the past, unit has no confirmed booking, and policy says auto-release. Verify final unit status after transaction.

**Success metric:** stale holds released without false release. **Never:** auto-release a booked unit, override a manager extension, or change price.

### 57.4 Collections assistant

**Trigger:** payment due/overdue, failed payment callback, or payment received without allocation.

**Action:** create reconciliation task; prepare demand/reminder from approved template; escalate to collections manager. Actual demand-letter issue, payment confirmation, waiver, and refund always require a human.

**Success metric:** days overdue and collection recovery. **Never:** declare a payment paid based on a chat message or attachment alone.

### 57.5 Source and team intelligence

**Trigger:** statistically meaningful conversion/response change versus baseline, not one bad day.

**Action:** produce a plain-language finding showing source, cohort, period, sample size, baseline, current rate, confidence/uncertainty, and affected spend/leads. Recommend a human decision such as shift attention, inspect campaign, or coach a team member. Never auto-pause campaigns or penalize staff.

### 57.6 Owner morning brief

At the tenant's chosen time, Jarvis creates a maximum five-item brief: immediate revenue risk, today’s visits, collections risk, source/team opportunity, and approvals waiting. Each sentence links to records and says whether Jarvis merely observed, drafted, acted, or needs permission.

---

## 58. Testing Jarvis On Real Systems Without Hurting Real Customers

### 58.1 The four test layers

1. **Deterministic unit/service tests:** feed fixed events and assert exact findings/actions/blocks. Run on every commit.
2. **Staging end-to-end tests:** real services against isolated database, queue, storage, and provider sandboxes/test numbers. Run on every release candidate.
3. **Production synthetic journeys:** use clearly marked `SYNTHETIC_TEST` tenant/lead/contact data and dedicated test sender/receiver accounts. Run continuously without touching real buyers, live inventory, or real payments.
4. **Shadow-mode evaluation on real data:** Jarvis reads real tenant data and records what it *would* do, but takes no action. Compare its proposed action with actual staff outcome before granting autonomy.

### 58.2 Required production synthetic journeys

Run at least these synthetic journeys every 15-60 minutes, with alerting on any failure and automatic cleanup after evidence is retained:

- lead ingestion -> dedupe -> assignment -> SLA/task -> dashboard visibility
- approved template send -> provider delivery webhook -> conversation timeline
- site visit -> reminder -> completion/no-show -> next task
- expired test unit hold -> safe release; never use a real sellable unit
- document upload link -> private storage -> scan/review queue -> expired link denied
- payment-provider test callback -> idempotent receipt/reconciliation state; never create a real financial transaction
- Jarvis finding -> policy block/draft/approval/autonomous safe action -> audit/result/undo
- tenant A access attempt to tenant B synthetic record -> denied and audited

Each run saves a `SyntheticJourneyRun`. A failure creates a Reliability Sentinel finding, alerts the configured owner/on-call channel, and pauses only the affected autonomous playbook after repeated failures. It does not silently keep trying buyer-facing actions.

### 58.3 Shadow-mode promotion rule

A playbook can move from Observe/Draft to Guardrailed Autonomous only when all conditions hold:

- at least 100 relevant shadow decisions or a documented lower threshold when volume is small;
- at least 95% of findings accepted as useful by managers or confirmed by later ground truth;
- zero critical policy/invariant violations;
- no unresolved duplicate-send, cross-tenant, inventory, payment, KYC, or consent failures;
- action has an idempotency key, cap, cooldown, audit trail, observable provider result, and undo/stop behavior where applicable;
- owner explicitly enables that specific playbook/category.

If quality drops below the tenant's policy threshold, automatically demote it to Draft mode and notify the owner. Do not hide bad Jarvis performance.

### 58.4 Controlled experiments and learning

For a proposed message/routing/follow-up improvement, use a small randomised or matched control group only after manager approval. Record cohort definition, policy/template version, target metric, expected window, exclusions, and stop criteria. Stop an experiment early if it harms response, opt-out, complaint, conversion, or compliance metrics. Never experiment on payment/KYC/legal actions or vulnerable/high-risk contacts.

### 58.5 Jarvis failure drills

Before each production release, deliberately test: model timeout, malformed model output, queue outage, database timeout, duplicate event, stale data, provider webhook delay, provider success without delivery receipt, killed/restarted worker, policy change during action, owner kill switch during action, and an attempted prompt injection in a buyer message/document.

Expected result in every drill: no unsafe action; a clear error/finding; full audit trail; retry only where safe; operator can identify and recover the exact affected record.

---

## 59. Jarvis Build Plan: Exact Order

### Milestone J1: Safe factual observer

**Files:** `backend/prisma/schema.prisma`; new `backend/src/jarvis/*`; `backend/src/mikey/*`; `dashboard-v2/src/pages/JarvisPage.tsx`; `dashboard-v2/src/lib/data.ts`; `dashboard-v2/src/App.tsx`; `dashboard-v2/src/components/layout/sidebar.tsx`.

Build `JarvisFinding`, policies, event consumer, scheduled scans for untouched hot leads/visit confirmations/expired holds/failed connectors, and a read-only command centre. Tests prove findings are tenant-scoped, evidence-backed, and deduplicated.

### Milestone J2: Drafts and approvals

Add `JarvisAction` and `JarvisApproval`, typed tools that only create drafts/tasks/approval cards, and the approval UI. Tests prove an approval expiry/rejection does not execute the action and an approver cannot exceed their role.

### Milestone J3: Shadow mode and evaluation

Add action simulation, outcome measurement, feedback controls, comparison dashboard, and automatic demotion. Run with a pilot builder until promotion criteria in Section 58.3 are met.

### Milestone J4: One autonomous playbook at a time

Enable first only `create_followup_task`; then approved welcome template delivery; then safe expired-hold release. Each needs its own feature flag, rate cap, rollback, synthetic journey, and 30-day quality report. Do not bundle autonomy changes.

### Milestone J5: Unified intelligence

Connect existing Mikey/operator and lead-agent memories through a shared, tenant-scoped summary/facts service. Ensure both read the same current CRM state and Jarvis policies. Keep direct customer conversation outputs under the same consent/template rules as manual sending.

### Milestone J6: Voice, only after trust

Add voice as a user interface to the same typed tools and policies. A spoken command must display/confirm the action exactly as a typed command would. Voice does not bypass approvals, authentication, or audit logging.

---

## 60. Jarvis Definition Of Done

Jarvis is ready for a paid builder only when:

- [ ] The owner sees a factual, useful daily brief with record links.
- [ ] Every Jarvis finding has evidence, status, age, and a clear next action.
- [ ] Every action is tenant-scoped, typed, idempotent, policy-checked, rate-limited, and audited.
- [ ] Owner can pause all activity or one playbook immediately.
- [ ] Draft/approval/autonomous state is visible before an action happens.
- [ ] Synthetic production journeys run and show recent pass/fail evidence.
- [ ] Shadow mode measures false positives and real outcome quality.
- [ ] A failure is visible, safe, recoverable, and never presented as success.
- [ ] Jarvis cannot access or expose sensitive data beyond the requesting user's permission.
- [ ] Jarvis cannot autonomously make a booking, handle money, verify KYC, alter price, or issue legal material.
- [ ] Pilot users say it saves meaningful daily work and catch rate improves without increased opt-outs, complaints, or data incidents.

---

## 61. Deep Research Expansion: The Full Indian Builder OS

### 61.1 Research conclusion

The earlier sections define a strong small-builder sales OS. Public Sell.Do material and Indian builder/post-sales products show that mature real-estate platforms go further: they continue from a lead all the way to online buying, agreements, loan/registration coordination, construction updates, customer service, transfer/cancellation/refund, possession, and handover.

This is not a reason to build a bloated ERP on day one. It is the complete map of what an Indian builder may eventually expect in one system. Build the sections below after the core revenue loop is proven, in the stated priority order.

Public evidence: Sell.Do describes online property search/cart/checkout, temporary online holds, negotiation approvals, 2D/3D inventory, campaign/velocity reports, hierarchy/territory management, and post-sales demand/document tooling. [Sell.Do online buying](https://www.sell.do/real-estate-crm-feature/e-commerce-integration), [inventory](https://www.sell.do/real-estate-crm-feature/inventory-software), [process management](https://www.sell.do/real-estate-crm/process-management), [marketing reports](https://www.sell.do/real-estate-crm-feature/marketing-reports), and [territories](https://www.sell.do/real-estate-crm-feature/territory-management) support this scope. Indian products also publicly cover construction updates, customer grievance handling, transfers, cancellations/refunds, payment/loan/registration checklists, possession, and channel-partner self-service. [DaeBuild](https://www.daebuild.com/), [Tranquil CRM](https://www.tranquilcrm.com/), [SquareFeetConnect](https://www.squarefeetconnect.com/), and [Briqhaus](https://briqhaus.com/) are useful competitive references.

### 61.2 Gap map: what to add beyond the current core

| Domain | Why Indian builders need it | Priority |
| --- | --- | --- |
| Online property buying | buyer can browse live units, hold briefly, pay token online, and complete booking without waiting for office hours | P2 |
| Visual inventory and allied inventory | apartment/plot is not enough; buyers need floor plans, parking, storage, terraces, and allotment rules | P1 |
| Launch and sales-control room | launch-day lead spikes, calls, slot capacity, inventory release, and approval bottlenecks need live control | P1 |
| Call-centre operations | pre-sales teams need IVR queues, dispositions, recordings, QA, and agent capacity data | P1 |
| Sales hierarchy/territories/quotas | multi-project teams need who reports to whom, who can see what, quota allocation, and territory performance | P2 |
| Advanced marketing | landing pages, campaign/creative library, spend import, audience segments, drip journeys, event/webinar/open-house management | P2 |
| Agreement-to-possession lifecycle | post-sales does not end with a payment reminder; it continues through loan, registration, transfer, cancellation, possession, and handover | P1 |
| Buyer confidence layer | construction updates, service tickets, documents, statements, and transparent milestones reduce anxious WhatsApp follow-ups | P1 |
| Finance controls | invoices, receipts, allocation, interest, additional charges, GST/TDS configuration, credit/refund workflows, cash-flow visibility | P1, accountant-reviewed |
| Channel partner operating system | registration, live inventory, quotas, collateral, visits, commission accrual/payout, disputes, and performance | P2 |
| Document/e-sign workflow | generation, review, e-sign routing, versioning, dispatch and search for agreements and letters | P1, legal-reviewed |
| Portfolio/landowner complexity | multi-project/phase inventory, resale/rental, landowner/employee quotas, co-promoter units, broker stock | P3 |
| Referral/after-sales growth | buyer referrals, NPS/CSAT, renewal/upgrade/resale opportunities, review requests | P3 |

`P1` means required for credible Indian builder post-sales. `P2` is a strong competitive advantage after the core works. `P3` is enterprise/portfolio depth; do not block a small-builder launch on it.

---

## 62. Online Property Buying And Digital Sales Room (P2)

### 62.1 Buyer experience

Build a public, project-branded property buying flow. A buyer may arrive from an ad/WhatsApp link, browse only approved available inventory, compare units, view floor plan/3D/virtual-tour assets, save favourites, request a callback/visit, calculate an estimated price/payment plan, and begin a booking.

The buyer journey is: project -> tower/floor -> unit card -> unit details -> cost-sheet estimate -> hold -> token/booking payment -> applicant details/KYC request -> booking confirmation. Show real availability only from the server. Do not cache a unit as available past a short refresh interval.

### 62.2 Required screens

- Project discovery page: location, RERA information, approved images/videos, amenities, configuration, possession estimate, brochure, contact/consent.
- Visual inventory page: tower/floor/unit map with filters; text/table alternative for accessibility; status labels; no internal blocked/management reason exposed.
- Unit comparison: selected units, area, facing, floor, price components allowed by policy, payment-plan estimate, downloadable/shareable comparison.
- Saved shortlist/cart: buyer's shortlisted units and last activity; lead is created/linked with e-commerce behaviour events.
- Checkout/booking wizard: identity, co-applicants, selected unit, approved price, temporary hold countdown, payment, terms acknowledgement, next steps.
- Sales digital room: salesperson-assisted version of the same view with controlled price/offer tools and a shareable buyer link.

### 62.3 Inventory and payment safety rules

- A checkout hold is separate from a salesperson hold. It lasts 10-20 minutes, has no manual extension, and is automatically released unless the server receives a verified payment/booking transition.
- All availability, price, hold, and booking checks occur in one server transaction immediately before payment intent creation and again immediately after payment verification.
- Payment gateway success redirect is not proof of payment. Confirm through the gateway's signed webhook, store its unique event ID, then complete the booking workflow.
- If payment is pending/unknown, show “We are confirming your payment” and create a reconciliation task; never show a false confirmed booking.
- Online flow must support a sales-assisted handoff: buyer begins online, salesperson can take over with audit history, and vice versa.
- Do not use deceptive fake scarcity. If showing activity such as “other buyers viewing,” it must be factual, privacy-safe, and tenant enabled.

### 62.4 Data models and events

Add `BuyerSession`, `UnitShortlist`, `CheckoutHold`, `CheckoutAttempt`, `PaymentIntent`, and `DigitalSalesEvent`. Events include `unit.viewed`, `unit.shortlisted`, `cost_sheet.viewed`, `checkout.started`, `checkout.abandoned`, `checkout_hold.created`, `payment.pending`, `payment.confirmed`, and `booking.confirmed`. Retain behavioral data according to consent/retention policy; do not use it to make sensitive inferences.

### 62.5 Jarvis role

Jarvis can detect abandoned checkout and create a task/draft a permitted follow-up. It cannot pressure a buyer, claim a unit is almost sold unless true, or send a message without the tenant's approved policy and consent.

---

## 63. Visual Inventory, Parking, And Inventory Release Control (P1)

### 63.1 What inventory really means

For a builder, inventory includes more than flats: projects, phases, towers, floors, units/plots, parking bays, storage, terraces, servant rooms, commercial shops, common/allied assets, and sometimes landowner/employee/broker allocations. Each is sellable, attachable, blocked, or policy-controlled in different ways.

### 63.2 Build requirements

- Add `ProjectPhase` between Project and Tower where the builder needs phases.
- Add `AlliedInventoryItem` with type (`PARKING`, `STORAGE`, `TERRACE`, `SERVANT_ROOM`, `OTHER`), project/tower/location, price/price-template, status, and allocation rules.
- A unit booking may allocate one or more allied items through an explicit `InventoryAllocation`; never encode parking in a free-text note.
- Model quota/ownership buckets: general sale, channel partner quota, landowner share, employee quota, management reserve, bank/mortgage blocked, developer internal. Every bucket has visibility and approval policy.
- Add `InventoryReleaseBatch`: project/phase, units, release date/time, approved by, release criteria, and audit. Launch-day release is a controlled operation, not a spreadsheet edit.
- Support project/tower floor-plan assets and unit-level assets with version and published/unpublished state. A buyer sees only published content.
- Add a visual map import/configuration tool, but always keep a table fallback. The map is a view over real unit records, not its own source of truth.

### 63.3 Launch-day control room

Build `#/launch-control` for large campaign/launch periods: real-time new lead volume, IVR queue, agents available, SLA breaches, visits, checkout holds, payment pending, units released/held/booked, connector health, and emergency pause controls. Provide a launch playbook: test all sources, load test, test inventory locks, staff roles, escalation contacts, communication templates, and a dry run before opening inventory.

---

## 64. Pre-Sales Call Centre And Field Sales Operations (P1)

### 64.1 Call-centre features

The basic call log is not enough for a 10-50 person builder team. Add campaign/virtual-number mapping, inbound queue, agent availability, call disposition, callback schedule, recordings, transcript permissions, live/near-real-time supervisor board, talk time, unanswered/missed-call recovery, break/shift state, and quality-review forms.

**Call disposition is mandatory:** connected-qualified, connected-follow-up, wrong number, no answer, busy, switched off, duplicate, not interested, language mismatch, site visit scheduled, lost reason. A disposition may require next-action date and notes. Do not let an agent close every call as “follow-up” forever; report repeated/no-progress loops.

### 64.2 Workforce and field discipline

Add `Shift`, `AgentAvailability`, `CallDisposition`, `CallQualityReview`, and `VisitAttendance`. Build manager views for capacity by hour, response SLA by shift/source, unanswered leads, coaching opportunities, and agent queue load. Location check-in for site visits is optional/consented; record manual check-in fallback and do not make employment decisions solely on GPS.

### 64.3 Jarvis role

Jarvis may recommend workload rebalancing or identify a missed-calls queue. It cannot silently punish, demote, or reassign a salesperson beyond the tenant's approved routing policy. Every performance recommendation shows enough context for a manager to challenge it.

---

## 65. Sales Hierarchy, Territories, And Approval Matrix (P2)

### 65.1 Hierarchy

The simple `OWNER/ADMIN/MANAGER/SALES_AGENT` roles are not enough when a builder has projects in multiple cities. Add a reporting tree, project/team membership, territory assignment, temporary delegation, and scope-aware data access. A manager may have access to Pune Project A but not Hyderabad Project B; a national sales head may see aggregate data without every private note.

### 65.2 Quotas and targets

Build monthly/quarterly targets by tenant, territory, project, team, agent, source, unit type, and collections. Track lead response, visits, bookings, agreement value, collections, and approved target definitions. Never compare agents with unequal territory/project/inventory opportunity without showing the context.

### 65.3 Approval matrix

Create configurable approval policies for discount, exceptional hold, unit release, booking exception, payment waiver, cancellation/refund, transfer, document dispatch, and commission payout. A policy says: scope, threshold, required approval chain, delegated approver rules, SLA, expiry, and what happens on timeout. Store the policy snapshot on each request.

---

## 66. Marketing, Launch, And Event Automation (P2)

### 66.1 Build the marketing control plane

Add landing-page/form builder based on approved components, UTM/creative tracking, campaign budget/spend import, lead-source mapping, creative/media library, audience segments, suppression lists, journey builder, bulk send calendar, and a compliance/consent check before every batch.

The journey builder supports entry event, audience condition, wait, approved send, task, webhook, score change, owner alert, and exit condition. It must show a dry-run count and sample recipients before activation. Version every journey; changing it must not alter the history of people already in a previous version.

### 66.2 Real-estate launch/events

Support open houses, broker meets, project launches, webinars, virtual site tours, and site-visit drives. An event has invitation list, RSVP, QR check-in, assigned sales host, lead/partner source, unit interest, notes, follow-up plan, cost/spend, and conversion report. A lead entering from an event retains the event attribution forever.

### 66.3 Marketing intelligence

Report spend -> lead -> contacted -> qualified -> visit -> hold -> booking -> agreement value -> collections. Show lead velocity by stage and time-to-convert. Do not promise causality from a tiny sample; show sample size/date range and label estimates.

---

## 67. Indian Post-Sales: Agreement To Possession (P1)

### 67.1 Customer lifecycle stages

Build an explicit post-sales state machine: `BOOKING_CONFIRMED` -> `KYC_IN_PROGRESS` -> `ALLOTMENT_ISSUED` -> `AGREEMENT_IN_PROGRESS` -> `AGREEMENT_REGISTERED` -> `PAYMENT_ACTIVE` -> `PRE_POSSESSION` -> `POSSESSION_OFFERED` -> `HANDED_OVER` -> `POST_POSSESSION_SUPPORT`. Also allow controlled exception journeys: `TRANSFER`, `UNIT_SHIFT`, `CANCELLATION`, `REFUND`, `LEGAL_HOLD`, `DEFAULT/RECOVERY`.

Do not make this a single dropdown. Each transition has document/payment/checklist/approval preconditions, accountable owner, due date, messages, and audit history.

### 67.2 Agreement, loan, and registration workspace

For every booking, create a checklist workspace with:

- booking form and allotment letter;
- applicant/co-applicant KYC and PAN policy;
- loan need, lender/bank, loan application and sanction status;
- disbursement request/received/reconciliation status;
- agreement draft/review/e-sign or physical-sign tracking;
- registration appointment, charges, receipt, registered agreement upload;
- bank NOC and any approved project/bank checklist;
- missing-document/escalation queue.

This system coordinates the workflow. Do not claim it performs bank underwriting or government registration. Integrate only through official/contracted partner APIs, otherwise track verified manual status/evidence.

### 67.3 Transfers, shifts, cancellations, and refunds

These are common post-sales realities and must be separate controlled cases.

- **Applicant/name transfer:** request, current/new applicant KYC, legal/finance review, charges, documents, approval, updated agreement/account snapshot, audit.
- **Unit shift:** source and target unit check, price/payment-plan difference, approved adjustment, inventory transaction changing both units atomically, revised documents/schedules, buyer acceptance.
- **Cancellation:** reason, policy snapshot, deductions, interest, refund payable, approval chain, release conditions, documents, and final customer communication.
- **Refund:** approved amount, bank-account verification policy, payment initiation reference, finance confirmation, receipt/ledger entries, buyer notification. Do not store unverified bank details in general notes.

### 67.4 Interest, charges, and finance configuration

Build a configurable, accountant-reviewed calculation engine for delayed-payment interest, additional charges, rebates, waivers, GST/TDS inputs, payment-plan changes, credit/debit notes, and invoices. The engine uses effective dates, approved formula versions, explicit rounding, and snapshots every computed result. It must support review/override with reason but never silently recompute historical issued documents.

Do not hard-code Indian tax, interest, stamp-duty, or registration values. They change by state/project/transaction and require builder/accountant/legal approval.

---

## 68. Construction Updates, Customer Care, And Possession (P1)

### 68.1 Construction confidence feed

Build a project/phase/tower milestone timeline. An authorised project user uploads approved progress update, photos/videos, date, stage, percent/status, notes, and customer-visible message. Marketing/content approval is separate from raw site upload. The buyer portal shows only approved updates relevant to their project/tower.

Schedule optional milestone notifications and let the buyer acknowledge/read them. The objective is fewer anxious calls and a trustworthy construction history, not pretending a project is on schedule when it is not.

### 68.2 Customer grievances and service tickets

Add a customer service module separate from sales follow-up. Buyer can raise a ticket through portal, WhatsApp/email intake, phone, or staff entry. Each ticket has category, severity, unit/project, owner, SLA, conversation history, attachments, customer-visible status, internal notes, escalation, resolution evidence, reopen rule, and CSAT after resolution.

Required categories: payment/account, document/agreement, loan/registration, construction update, possession, defect/service, communication, cancellation/transfer, other. Reports: open/overdue/reopened tickets, category trend, SLA compliance, customer satisfaction, and project-level root causes.

Jarvis may classify/route/summarize tickets and warn of repeated issue clusters. It cannot close a ticket without resolution evidence and configured customer/agent confirmation.

### 68.3 Possession and handover

Build a possession case with preconditions: account/payment clearance policy, document/legal clearance, NOC/checklist, unit readiness/inspection, key/asset handover, meter/utility handoff where applicable, signed possession acknowledgment, and final documents. It generates only tenant-approved possession documents and retains a full timeline.

Post-handover, support defect-liability/service requests, resident/society handoff records where relevant, final satisfaction/referral request, and secure document access. Never issue possession automatically because a date passed.

---

## 69. Legal Documents, E-Sign, And Searchable File Cabinet (P1)

### 69.1 Document factory

Expand the document system into a controlled factory: booking form, cost sheet, allotment letter, payment schedule, demand letter, receipt, statement, interest letter, reminder, agreement draft/final, cancellation/refund letter, transfer letter, NOC, possession letter, handover checklist, and channel-partner commission statement.

Each template has owner, legal/accountant approver, jurisdiction/project scope, effective start/end date, variables, calculation/formula version, language, output format, and status (`DRAFT`, `APPROVED`, `RETIRED`). Document generation snapshots data/template/formulas and produces a permanent version. Existing issued documents are never overwritten.

### 69.2 E-sign workflow

Treat e-sign as a provider integration: create envelope, choose signers/order, set expiry/reminders, preserve provider event IDs/audit trail, receive verified webhook, store signed final document/private certificate, and report incomplete/expired/rejected signature requests. Manual/physical signing remains supported. Do not say a document is legally signed merely because a buyer clicked an internal checkbox.

### 69.3 Search and custody

Add permission-aware search across filename, customer, unit, project, document type, status, date, and allowed extracted text. Track physical-file custody too when builders retain paper originals: file number, location, checked out by, due back, scan link, and history. Sensitive-document search results reveal only what the user's role allows.

---

## 70. Channel Partner And Broker OS Expansion (P2)

### 70.1 Beyond lead registration

A useful partner portal provides partner onboarding/KYC/RERA status, onboarding training/terms acceptance, project/launch access, approved collateral/price updates, live eligible inventory, lead registration/claim, visit slots, buyer updates permitted by policy, booking status, commission plan, accrual statement, payout status, support tickets, and broker-meet/event invitations.

### 70.2 Commission engine

Commission needs its own versioned policy: project/unit type, partner tier, campaign/scheme, booking or collection trigger, gross/net definition, clawback/refund/cancellation logic, tax/TDS configuration approved by finance, approval chain, payout batch, and remittance evidence. It should calculate a proposed accrual automatically but finance confirms payout. Store policy and sale snapshot; do not retroactively change historical approved commissions.

### 70.3 Partner governance

Add quota/allocation where desired, lead lock/duplicate dispute workflow, partner scorecard, suspension/deactivation, document expiry alerts, prohibited sharing rules, and audit. A partner can never see unrelated buyer data, internal unit reserve reasons, other partner terms, or unapproved price/offer information.

---

## 71. Portfolio, Builder Finance, And Enterprise Edges (P3)

These are valuable, but only after P1/P2 is stable. Add them as independent, feature-flagged modules:

- Portfolio dashboard across entities, cities, projects, phases, towers and sales offices.
- Project cash-flow forecast: bookings, scheduled demand, collections, refunds, commission, planned expenses; label forecasts clearly and reconcile with approved finance system rather than replacing accounting without a proper integration.
- Landowner/co-promoter inventory and revenue-share allocation.
- Resale/rental listing inventory distinct from new developer units.
- Referral/loyalty program with consented referral tracking, reward approvals, fraud checks, and payout audit.
- NRI/international workflow: timezone, passport/overseas address document rules, remote virtual tours, secure document sharing, authorised payment process. Obtain legal/finance review before introducing country-specific claims.
- Vendor/construction ERP integration for milestone updates. The CRM reads approved construction progress; it should not become a construction accounting system unless that is a deliberate separate product decision.

---

## 72. Updated Full Build Sequence

1. Core lead, messaging, visit, live inventory, cost sheet, booking, KYC, payment schedule, owner desk, and safe Jarvis observer.
2. P1 hardening: call-centre operations, visual/allied inventory, launch control, document factory, controlled post-sales/account lifecycle, buyer tickets, construction updates, possession.
3. P2 growth: online buying, marketing/event control plane, territory/target hierarchy, full partner OS/commission engine, approved Jarvis playbooks.
4. P3 portfolio/enterprise: multi-entity finance forecast, landowner allocations, resale/rental, referral/NRI, construction/ERP integrations.

At every phase ask one question: “Does this remove a real daily spreadsheet, WhatsApp chain, missed follow-up, manual document, buyer anxiety, or revenue leak for an Indian builder?” If not, do not build it yet.
