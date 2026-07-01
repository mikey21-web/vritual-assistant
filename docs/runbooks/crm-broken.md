# Runbook: CRM Integration Broken

**Severity:** High
**Symptoms:** Lead/contact sync failures, "Integration disconnected" in dashboard

## Step 1 — Test Integration
Go to: Dashboard → Integrations → Test Connection
Note the reported error message.

## Step 2 — Check OAuth Tokens
```bash
# Check if tokens have expired (HubSpot/Salesforce tokens expire after 1h-24h)
# Tokens are stored encrypted in the integrations table config
docker logs --tail=30 backend | grep -i "token\|oauth\|refresh\|401"
```

## Step 3 — Re-authenticate
- **HubSpot**: Go to Settings → Integrations → HubSpot → "Reconnect"
- **Salesforce**: Go to Settings → Integrations → Salesforce → "Reconnect"
- **Zoho**: Go to Settings → Integrations → Zoho → "Reconnect"

## Step 4 — Check API Limits
- HubSpot: 100 req/10s per app — check `X-HubSpot-RateLimit-*` headers
- Salesforce: Varies by plan — check API request log in Salesforce admin
- Zoho: 100 req/min — check rate limit headers in logs

## Step 5 — Verify Webhook Endpoints
If CRM push is failing:
- Ensure the webhook URL is publicly reachable
- Check the webhook secret matches in both systems
- Verify SSL certificate is valid

## Step 6 — Last Resort
1. Remove and re-add the integration
2. Contact CRM support if API is down
3. Escalate to: system administrator with full API error logs
