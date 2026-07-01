# Runbook: WhatsApp Messages Failing

**Severity:** High
**Symptoms:** "Failed to send WhatsApp" errors, outbox stuck on WhatsApp messages

## Step 1 — Check Meta Status
Visit: https://metastatus.com/ — Check WhatsApp Cloud API status

## Step 2 — Verify Webhook Signature
```bash
docker logs backend | grep -i "whatsapp\|webhook"
```
Look for: `HMAC verification failed` — check `WHATSAPP_APP_SECRET`

## Step 3 — Check WABA Approval
- Log in to: https://developers.facebook.com/
- Go to: WhatsApp → Embedded Signup
- Check: Business Verification, Phone Number Status, Template Status

## Step 4 — Test Manually
```bash
curl -X POST https://graph.facebook.com/v18.0/<PHONE_NUMBER_ID>/messages \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"messaging_product":"whatsapp","to":"<TEST_NUMBER>","type":"text","text":{"body":"Test"}}'
```

## Step 5 — Common Fixes
- **Token expired**: Generate new access token in Meta Business Suite
- **Number not approved**: Submit business verification
- **Template rejected**: Check template status in WABA manager
- **Rate limited**: Wait 5 minutes, reduce send volume
