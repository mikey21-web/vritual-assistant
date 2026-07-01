# Runbook: Queue Is Backed Up

**Severity:** High
**Symptoms:** Delayed WhatsApp messages, overdue automations, growing outbox table

## Step 1 — Check Queue Depth
```bash
# BullMQ queues (Redis)
docker exec redis redis-cli LLEN bull:automation-schedule
docker exec redis redis-cli LLEN bull:failure-retry
```

## Step 2 — Check Failed Jobs
```bash
docker exec redis redis-cli ZCOUNT bull:failure-retry:failed -inf +inf
```

## Step 3 — Check Worker Logs
```bash
docker logs --tail=50 backend | grep -i "queue\|bull\|job"
```

## Step 4 — Common Causes
- **Redis full**: `docker exec redis redis-cli INFO memory | grep used_memory_human`
- **Worker crashed**: Check `docker ps` — backend should be running
- **API rate limits**: WhatsApp/Meta may be throttling
- **Bad credentials**: Check integration configs in dashboard

## Step 5 — Manual Drain
```bash
# If outbox messages are stuck, trigger manual drain
curl -X POST http://localhost:3001/admin/drain -H "Authorization: Bearer <admin-token>"
```
