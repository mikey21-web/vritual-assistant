# n8n Workflow Setup Guide

## Architecture

**The client changes business rules in the dashboard. The backend stores and protects those rules. n8n executes those rules.**

n8n is the execution layer. It reads configuration from the backend API and never hardcodes business logic.

## Environment Variables

Set in n8n container or .env:

```
N8N_BACKEND_API_URL=http://backend:3001
```

## Importing Workflows

1. Open n8n at http://localhost:5678
2. Go to Settings (gear icon) > Import from File
3. Select each `.json` file from `n8n/workflows/`
4. After import, activate each workflow

## Workflow Descriptions

### 1. Universal Lead Intake (01-lead-intake.json)
- **Trigger**: POST /webhook/lead-intake
- **Purpose**: Receives leads from any source, normalizes, calls backend, handles dedup

### 2. WhatsApp Incoming (02-whatsapp-incoming.json)
- **Trigger**: POST /webhook/whatsapp-webhook
- **Purpose**: Handles WhatsApp Cloud API webhooks, normalizes Meta format, stores messages

### 3. Send Message (03-send-message.json)
- **Trigger**: POST /webhook/send-message
- **Purpose**: Fetches template, renders variables, stores outbound message

### 4. Follow-up Runner (04-followup-runner.json)
- **Trigger**: Schedule (every 15 min)
- **Purpose**: Fetches active nurture sequences, executes due steps

### 5. Hot Lead Alert (05-hot-lead-alert.json)
- **Trigger**: POST /webhook/hot-lead-alert
- **Purpose**: Receives `lead.hot` event, fetches details, creates task, notifies team

### 6. CRM Push (06-crm-push.json)
- **Trigger**: POST /webhook/crm-push
- **Purpose**: Fetches CRM mapping, transforms fields, updates conversion

### 7. Appointment Booking (07-appointment-booking.json)
- **Trigger**: POST /webhook/appointment-request
- **Purpose**: Generates booking link, tracks conversion

### 8. Quote Request (08-quote-request.json)
- **Trigger**: POST /webhook/quote-request
- **Purpose**: Creates sales task, tracks conversion

### 9. Payment Success (09-payment-success.json)
- **Trigger**: POST /webhook/payment-success
- **Purpose**: Normalizes payment webhook, updates conversion status

### 10. Digital Download (10-digital-download.json)
- **Trigger**: POST /webhook/digital-download
- **Purpose**: Fetches signed download URL, logs delivery

### 11. Daily Summary (11-daily-summary.json)
- **Trigger**: Schedule (daily at 9 AM)
- **Purpose**: Fetches analytics, formats report, stores event

### 12. Error Alert (12-error-alert.json)
- **Trigger**: n8n error trigger
- **Purpose**: Captures any workflow error, stores in backend

## Testing Webhooks

Use curl or Postman to test:

```bash
# Test Lead Intake
curl -X POST http://localhost:5678/webhook/lead-intake \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","phone":"+1234567890","message":"Interested"}'

# Test Hot Lead Alert
curl -X POST http://localhost:5678/webhook/hot-lead-alert \
  -H "Content-Type: application/json" \
  -d '{"leadId":"some-lead-uuid"}'
```

## Production Webhook URLs

When deploying to production, update webhook URLs:

1. WhatsApp Cloud API: `https://n8n.yourdomain.com/webhook/whatsapp-webhook`
2. Payment Gateway: `https://n8n.yourdomain.com/webhook/payment-success`
3. Form endpoints: `https://n8n.yourdomain.com/webhook/lead-intake`

## Customization

Each workflow calls the backend API for configuration. To customize behavior:
1. Change settings in the dashboard (campaigns, templates, rules)
2. n8n workflows automatically read the updated configuration
3. No workflow JSON changes needed
