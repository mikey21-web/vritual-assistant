# API Reference

Base URL: `http://localhost:3001`

## Authentication

All endpoints except `/auth/*`, `/webhooks/*`, and `/forms/:id/submit` require a JWT bearer token.

### POST /auth/register
Register a new user.

### POST /auth/login
Login. Returns `{ accessToken, user }`.

### GET /auth/me
Get current user profile.

---

## Business Settings

### GET /business-settings
Get business profile. Requires auth.

### PATCH /business-settings
Update business profile. Roles: OWNER, ADMIN.

---

## Users

### GET /users
List all users. Roles: OWNER, ADMIN, MANAGER.

### POST /users
Create user. Roles: OWNER, ADMIN.

### GET /users/:id
Get user details.

### PATCH /users/:id
Update user. Roles: OWNER, ADMIN.

### DELETE /users/:id
Delete user. Roles: OWNER.

---

## Contacts

### GET /contacts?search=&page=&limit=
Paginated contact list with search.

### POST /contacts
Create contact.

### GET /contacts/:id
Get contact with leads.

### PATCH /contacts/:id
Update contact.

---

## Leads

### GET /leads?status=&segment=&source=&campaignId=&assignedAgentId=&search=
Paginated lead pipeline with filters.

### POST /leads
Create lead.

### GET /leads/:id
Get lead with contact, agent, conversations, conversions, tasks.

### PATCH /leads/:id
Update lead.

### POST /leads/:id/score
Run scoring engine on lead.

### POST /leads/:id/assign
Assign agent to lead. Body: `{ agentId }`.

### POST /leads/:id/mark-spam
Mark lead as spam. Sets status=SPAM, segment=UNQUALIFIED, score=-100.

---

## Campaigns

### GET /campaigns
List campaigns.

### POST /campaigns
Create campaign.

### GET /campaigns/:id
Get campaign with form, QR code, nurture sequence.

### PATCH /campaigns/:id
Update campaign.

### POST /campaigns/:id/pause
Pause campaign.

### POST /campaigns/:id/activate
Activate campaign.

### POST /campaigns/:id/duplicate
Duplicate campaign.

### GET /campaigns/:id/performance
Campaign performance stats.

---

## Forms

### GET /forms
List forms with fields.

### POST /forms
Create form.

### GET /forms/:id
Get form with fields.

### PATCH /forms/:id
Update form.

### POST /forms/:id/fields
Add field. Body: `{ label, fieldKey, type, required, placeholder, options, displayOrder }`.

### PATCH /forms/:id/fields/:fieldId
Update field.

### DELETE /forms/:id/fields/:fieldId
Remove field.

### POST /forms/:id/submit
Submit form (public, no auth).

---

## QR Codes

### GET /qr-codes
List QR codes with scan counts.

### POST /qr-codes
Create QR code.

### GET /qr-codes/:id
Get QR code.

### PATCH /qr-codes/:id
Update QR code.

### GET /qr-codes/:id/image
Generate QR image as data URL.

### POST /qr-codes/:id/scan
Record scan.

---

## Conversations

### GET /conversations?leadId=&channel=
List messages.

### GET /leads/:id/conversations
Get conversation for a lead.

### POST /conversations/messages
Create message. Body: `{ text, channel, direction, leadId, contactId, providerMessageId }`.

---

## Message Templates

### GET /message-templates
List templates with media.

### POST /message-templates
Create template.

### GET /message-templates/:id
Get template.

### PATCH /message-templates/:id
Update template (auto-increments version).

### POST /message-templates/:id/preview
Render template with variables. Body: `{ "contact.name": "John", ... }`.

---

## Media

### GET /media?category=&fileType=&search=
List media files.

### POST /media/upload
Upload file (multipart/form-data). Field: `file`.

### GET /media/:id
Get media metadata.

### PATCH /media/:id
Update media.

### DELETE /media/:id
Delete media.

### POST /media/:id/attach
Attach to lead/campaign/template. Body: `{ leadId?, campaignId?, templateId? }`.

### POST /media/:id/detach
Detach from all.

### GET /media/:id/download-url
Get download URL.

### GET /leads/:id/media
Get lead attachments.

### POST /leads/:id/media
Attach to lead. Body: `{ mediaId }`.

### GET /campaigns/:id/media
Get campaign media.

### POST /campaigns/:id/media
Attach to campaign.

### GET /message-templates/:id/media
Get template media.

### POST /message-templates/:id/media
Attach to template.

---

## Nurture Sequences

### GET /nurture-sequences
List sequences with steps.

### POST /nurture-sequences
Create sequence.

### GET /nurture-sequences/:id
Get sequence.

### PATCH /nurture-sequences/:id
Update sequence.

### POST /nurture-sequences/:id/steps
Add step. Body: `{ type, displayOrder, config, templateId?, waitSeconds? }`.

### PATCH /nurture-sequences/:id/steps/:stepId
Update step.

### DELETE /nurture-sequences/:id/steps/:stepId
Delete step.

---

## Scoring Rules

### GET /scoring-rules
List rules.

### POST /scoring-rules
Create rule.

### PATCH /scoring-rules/:id
Update rule.

### DELETE /scoring-rules/:id
Delete rule.

### POST /scoring-rules/test
Test rule with sample values.

---

## Routing Rules

### GET /routing-rules
List rules.

### POST /routing-rules
Create rule.

### PATCH /routing-rules/:id
Update rule.

### DELETE /routing-rules/:id
Delete rule.

### POST /routing-rules/test
Test rule.

---

## Tasks

### GET /tasks?status=&assigneeId=&leadId=
List tasks.

### POST /tasks
Create task.

### GET /tasks/:id
Get task.

### PATCH /tasks/:id
Update task.

---

## Conversions

### GET /conversions?destination=&status=&leadId=
List conversions.

### POST /conversions
Create conversion.

### POST /leads/:id/conversions
Create conversion for lead.

### PATCH /conversions/:id
Update conversion.

---

## Integrations

### GET /integrations
List integrations. Roles: OWNER, ADMIN.

### POST /integrations
Create integration.

### GET /integrations/:id
Get integration.

### PATCH /integrations/:id
Update integration.

### DELETE /integrations/:id
Delete integration.

### POST /integrations/:id/test
Test integration connection.

---

## CRM Mappings

### GET /crm-mappings
List mappings.

### POST /crm-mappings
Create mapping.

### PATCH /crm-mappings/:id
Update mapping.

### POST /crm-mappings/:id/test
Test mapping.

---

## Booking Settings

### GET /booking-settings
List settings.

### POST /booking-settings
Create setting.

### PATCH /booking-settings/:id
Update setting.

### POST /booking-settings/:id/test
Test setting.

---

## Automation Events

### GET /automation-events?status=&type=
List events.

### POST /automation-events
Create event.

### POST /automation-events/:id/retry
Retry failed event.

---

## Custom Fields

### GET /custom-fields/definitions
List custom field definitions.

### POST /custom-fields/definitions
Create definition.

### PATCH /custom-fields/definitions/:id
Update definition.

### DELETE /custom-fields/definitions/:id
Delete definition.

### GET /custom-fields/values/:target/:targetId
Get values (target = contact|lead).

### POST /custom-fields/values/:target/:targetId
Set values. Body: `{ values: [{ definitionId, value }] }`.

---

## Analytics

### GET /analytics/overview
Total, hot, warm, cold, converted, conversion rate.

### GET /analytics/sources
Leads grouped by source.

### GET /analytics/campaigns
Campaign performance.

### GET /analytics/conversions
Conversions by destination and status.

### GET /analytics/agents
Agent performance.

---

## Webhooks (no auth)

### POST /webhooks/forms
Form submission webhook.

### POST /webhooks/whatsapp
WhatsApp message webhook.

### POST /webhooks/social
Social media webhook.

### POST /webhooks/calls
Phone call webhook.

### POST /webhooks/payments
Payment webhook.

### POST /webhooks/chatbot
Chatbot webhook.

### POST /webhooks/mobile-app
Mobile app webhook.

---

## Audit Logs

### GET /audit-logs?entity=&entityId=&userId=
Paginated audit trail. Roles: OWNER, ADMIN, MANAGER.
