# n8n Workflows

This directory contains reusable n8n workflows that read configuration from the backend instead of hardcoding campaign logic.

## Architecture Rule

**The client changes business rules in the dashboard. The backend stores and protects those rules. n8n executes those rules. The database remembers everything.**

n8n must NOT be the main database. Every workflow calls the backend API to:
1. Read current configuration (campaigns, templates, scoring rules, routing rules)
2. Store results (messages, events, status updates)
3. Avoid hardcoding any business logic

## Workflows

### 1. Universal Lead Intake
- **Trigger**: Form/QR/Chatbot/Social/Mobile webhook
- **Action**: Validates payload, calls backend webhooks endpoint, triggers downstream actions based on backend response

### 2. WhatsApp Incoming Message  
- **Trigger**: WhatsApp Cloud API webhook  
- **Action**: Normalizes payload, stores message via backend, auto-replies if template configured

### 3. Send Message
- **Trigger**: Called by backend or other workflows
- **Action**: Renders template from backend, sends via WhatsApp/Email/SMS, logs delivery

### 4. Follow-up Runner
- **Trigger**: Scheduled (every 15 min)
- **Action**: Fetches due nurture steps from backend, executes each step

### 5. Hot Lead Alert
- **Trigger**: `lead.hot` event
- **Action**: Fetches lead summary, notifies assigned agent/manager

### 6. CRM Push
- **Trigger**: `crm.push_requested`
- **Action**: Fetches CRM mapping, transforms fields, pushes to CRM

### 7. Appointment Booking
- **Trigger**: `appointment.requested`
- **Action**: Sends booking link, listens for confirmation webhook

### 8. Quote Request
- **Trigger**: `quote.requested`
- **Action**: Creates sales task, notifies team

### 9. Payment Success
- **Trigger**: Payment provider webhook
- **Action**: Verifies payment, updates conversion, sends confirmation

### 10. Digital Download Delivery
- **Trigger**: `digital_download.requested`
- **Action**: Gets signed download URL from backend, delivers via WhatsApp/Email

### 11. Daily Sales Summary
- **Trigger**: Daily schedule
- **Action**: Calls analytics endpoints, prepares summary, sends to owner

### 12. Error Alert
- **Trigger**: n8n error trigger
- **Action**: Captures workflow error, notifies admin, stores error event

## Setup

Import each workflow JSON file into your n8n instance via Settings > Import Workflow.
