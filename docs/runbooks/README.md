# Operations Runbooks

Common issue troubleshooting guides for the lead automation platform.

## Runbooks

- [Backend Down](backend-down.md) — Backend service crash or unavailability
- [Queue Backed Up](queue-backed-up.md) — BullMQ queues growing
- [WhatsApp Messages Failing](whatsapp-failing.md) — Outbound WhatsApp delivery issues
- [CRM Integration Broken](crm-broken.md) — HubSpot/Salesforce/Zoho connectivity issues

## Quick Reference

| Issue | First Check | Escalation |
|-------|------------|------------|
| Backend 503 | `docker ps`, `docker logs backend` | Check Postgres/Redis health |
| Queue growing | `redis-cli llen bull:*` | Restart worker, check API keys |
| WhatsApp failing | Check Meta status, verify webhook secret | Check WABA approval |
| CRM broken | Re-test integration in dashboard | Refresh OAuth tokens |
