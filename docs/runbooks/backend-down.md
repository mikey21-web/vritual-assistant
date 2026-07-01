# Runbook: Backend Is Down

**Severity:** Critical
**Symptoms:** 502/503 from API, health checks failing, dashboard shows errors

## Step 1 — Check Container Status
```bash
docker ps | grep backend
docker logs --tail=100 backend
```

## Step 2 — Check Dependencies
```bash
# Database
docker exec postgres pg_isready -U postgres

# Redis
docker exec redis redis-cli ping
```

## Step 3 — Verify Environment
```bash
docker exec backend printenv | grep -E '^(JWT_SECRET|DATABASE_URL|REDIS_URL)'
```
Expected: All three must be set and non-default.

## Step 4 — Restart
```bash
docker-compose restart backend
# Or full stack:
docker-compose down && docker-compose up -d
```

## Step 5 — If Still Failing
- Check for recent migrations: `docker exec backend npx prisma migrate status`
- Check port conflicts: `netstat -tlnp | grep 3001`
- Check disk: `df -h` (Postgres may be out of space)
- Escalate to: system administrator with full logs
