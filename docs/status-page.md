# Status Page Setup

## Recommended Provider

- **Statuspage** (statuspage.io) — paid, owned by Atlassian
- **Better Uptime** (betteruptime.com) — paid, more features
- **Hund** (hund.io) — European
- **Cachet** (cachethq.io) — self-hosted open-source

## Implementation Plan

### 1. Choose Provider
For single-tenant deployments, we recommend **Better Uptime** with:
- Public status page at `status.<client-domain>`
- Incident management
- Slack/PagerDuty integration
- Email/SMS subscriber notifications

### 2. Components to Monitor
- Backend API (`/health/ready`)
- Dashboard (`/`)
- Webhook endpoint (`/webhooks/whatsapp`)
- Background workers (BullMQ queue depth)
- Database (via health check)
- Redis (via health check)
- n8n (via health check)

### 3. Incident Categories
| Category | Severity | Customer Impact |
|----------|----------|-----------------|
| API down | High | Cannot use dashboard |
| Slow response | Medium | Slow dashboard |
| Messages delayed | High | Lost conversations |
| Integration down | Medium | CRM sync failed |
| Backup failed | High | Data at risk |

### 4. Runbook Integration

Each status page component should have:
- Health check URL
- Runbook link
- On-call rotation
- Escalation contacts

### 5. Communication Templates

**Initial Incident Notice**:
> We're investigating reports of [symptom]. Our team is working on it. Updates every 15 minutes.

**Resolved Notice**:
> The issue has been resolved. [Root cause in 2 sentences]. We apologize for the disruption.

## Self-Hosted Option

If self-hosting is required:

1. Deploy Cachet (https://github.com/CachetHQ/Cachet)
2. Set up incident management via Slack integration
3. Configure health check polling via Prometheus blackbox exporter

```yaml
# docker-compose.yml addition
cachet:
  image: cachethq/docker:latest
  ports:
    - "8282:8000"
  environment:
    - DB_DRIVER=sqlite
```

## Pre-Deployment Checklist

- [ ] Status page URL provisioned
- [ ] Custom domain configured
- [ ] SSL certificate installed
- [ ] Health check endpoints accessible from public internet
- [ ] On-call rotation populated
- [ ] Subscriber form working
- [ ] Incident templates prepared
