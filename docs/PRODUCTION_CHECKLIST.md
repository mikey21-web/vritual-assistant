# Production Readiness Checklist

Before deploying to production, verify every item:

## Security
- [ ] JWT_SECRET changed to random 64-char string (not "dev-secret" or "change-me-...")
- [ ] WEBHOOK_API_KEY_FORMS, _SOCIAL, _CALLS, _CHATBOT, _MOBILE_APP all set to unique random values
- [ ] WHATSAPP_APP_SECRET set
- [ ] STRIPE_WEBHOOK_SECRET set
- [ ] CORS_ORIGIN locked to production domain
- [ ] DATABASE_URL uses strong password (not "postgres:postgres")
- [ ] REDIS_URL has password enabled
- [ ] Swagger disabled (NODE_ENV=production)
- [ ] Helmet security headers active
- [ ] Rate limiting configured per endpoint type

## Database
- [ ] `prisma migrate deploy` executed successfully
- [ ] All 38 tables created
- [ ] Backup script configured: daily cron at 2am
- [ ] Backup retention: 7-day rotation
- [ ] Backup to S3/remote configured
- [ ] Restore procedure tested

## Integrations
- [ ] HubSpot: API key set, push tested
- [ ] Salesforce: credentials set, OAuth flow tested
- [ ] Zoho: refresh token valid, push tested
- [ ] Calendly: API key set, booking link creation tested
- [ ] Google Calendar: service account configured, event creation tested
- [ ] WhatsApp: phone number ID + access token set, send/receive tested
- [ ] Email: SMTP credentials set, send tested

## n8n
- [ ] All 12 workflows imported
- [ ] N8N_BACKEND_API_URL set to backend URL
- [ ] N8N_BACKEND_JWT set to valid admin JWT
- [ ] Webhook URLs configured and reachable
- [ ] Each workflow triggered and verified end-to-end

## Roles & Permissions
- [ ] OWNER account created
- [ ] ADMIN account created
- [ ] MANAGER account created
- [ ] SALES_AGENT test: cannot access settings/integrations
- [ ] VIEWER test: cannot edit anything
- [ ] Webhooks public (API key auth only)
- [ ] Auth endpoints public

## Client Handover
- [ ] Master template config separated from client config
- [ ] Admin setup wizard accessible (OWNER only)
- [ ] Test mode available (TEST_MODE=true)
- [ ] Backup before migration enabled
- [ ] Client received proper role (not OWNER)
- [ ] Audit logging verified

## Monitoring
- [ ] Health endpoint: GET /health
- [ ] Health detailed: GET /health/detailed (DB, Redis, CRM status)
- [ ] Queue monitoring accessible (OWNER/ADMIN only)
- [ ] Error alerts configured (workflow #12)
- [ ] Uptime monitor pointed at /health
- [ ] Backup failure alerts configured

## Final Sign-off
- [ ] Backend build: `npm run build` passes
- [ ] Dashboard build: `npm run build` passes
- [ ] Backend tests: `npm test` all pass
- [ ] Database: `prisma migrate deploy` applies cleanly
- [ ] Docker Compose: all services health-check green
- [ ] SSL certificates valid
- [ ] DNS resolves correctly
- [ ] Firewall rules allow required ports
