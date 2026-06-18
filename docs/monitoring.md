# Monitoring Setup

## Health Checks

The backend exposes:

```
GET /health → { status, timestamp, checks: { database, uptime, memory } }
GET /sandbox/test → full system self-check (roles: OWNER, ADMIN only)

## Recommended Monitoring Stack

1. **Uptime** — ping `GET /health` every 30s (use UptimeRobot, Better Uptime, or Prometheus)
2. **Logs** — ship logs to Datadog/Loki/CloudWatch via Docker driver or stdout
3. **Metrics** — add Prometheus exporter for:
   - `POST /metrics` — queue depth, request rate, error rate
4. **Alerts** — alert on:
   - Health check fails 3x in a row
   - Failure inbox has items > 10
   - Database connections exhausted
   - Redis disconnected

## Queue Monitoring

The `automation-retry` BullMQ queue runs on Redis. Monitor via:

```bash
# Check queue depth
redis-cli LLEN bull:automation-retry:wait
redis-cli LLEN bull:automation-retry:active
redis-cli LLEN bull:automation-retry:failed
```

## Database Backup Verification

Run the backup script daily via cron:

```bash
0 2 * * * cd /app && ./scripts/backup.sh >> /var/log/backup.log 2>&1
```

## Admin Dashboard

From the dashboard:
- `/audit-logs` — who did what
- `/failure-inbox` — failed automation events
- `/analytics` — business metrics
- `/health` — system health
