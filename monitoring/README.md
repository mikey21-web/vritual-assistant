# Monitoring & Observability — Lead Automation Platform

This document describes the health check endpoints, Prometheus metrics, container health monitoring, and external uptime monitoring options available for the platform.

---

## 1. Health Endpoints

All health endpoints are served by the **backend** (container: `lead-automation-backend`, port **3001**).

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/health` | GET | Public | Shallow check — returns `{ status: "ok", timestamp }` |
| `/health/live` | GET | Public | Kubernetes-style liveness probe — same as `/health` |
| `/health/ready` | GET | Public | Readiness probe — checks database connectivity |
| `/health/deep` | GET | JWT (ADMIN) | Deep dependency check — tests DB, Redis, n8n, Claude API, storage, integrations |
| `/metrics` | GET | Public | Prometheus metrics (counter, histogram, gauge) |

### Quick health check from CLI

```bash
# Shallow (always works)
curl -s http://localhost:3001/health

# Readiness (checks DB)
curl -s http://localhost:3001/health/ready

# Deep check (requires JWT)
curl -s -H "Authorization: Bearer $ADMIN_JWT" http://localhost:3001/health/deep

# Prometheus metrics
curl -s http://localhost:3001/metrics
```

### Expected responses

```json
// GET /health
{ "status": "ok", "timestamp": "2026-07-04T12:00:00.000Z" }

// GET /health/ready
{
  "status": "ok",
  "timestamp": "2026-07-04T12:00:00.000Z",
  "checks": {
    "database": "connected",
    "uptime": 12345.6,
    "memory": 128
  }
}

// GET /health/deep
{
  "status": "degraded",
  "timestamp": "2026-07-04T12:00:00.000Z",
  "version": "1.5.0",
  "uptime": 12345.6,
  "dependencies": {
    "database": { "status": "ok", "latencyMs": 3 },
    "redis":     { "status": "ok", "latencyMs": 1, "detail": "ping OK" },
    "n8n":       { "status": "ok", "latencyMs": 45, "detail": "reachable" },
    "storage":   { "status": "ok", "detail": "provider: local" },
    "claude":    { "status": "unconfigured", "detail": "ANTHROPIC_API_KEY not set" }
  }
}
```

---

## 2. Prometheus Metrics

Metrics are exposed at `http://localhost:3001/metrics` in Prometheus text format.

### Available metric types

| Metric | Type | Labels | Description |
|---|---|---|---|
| `http_requests_total` | Counter | `method`, `path`, `status` | Total HTTP requests |
| `http_request_duration_seconds` | Histogram | `method`, `path` | Request latency distribution |
| `active_connections` | Gauge | — | Currently active WebSocket connections |

### Scrape configuration (prometheus.yml)

```yaml
scrape_configs:
  - job_name: 'lead-automation-backend'
    static_configs:
      - targets: ['localhost:3001']
    metrics_path: /metrics
    scrape_interval: 15s
```

### Adding with Grafana

1. Add Prometheus as a data source pointing to your Prometheus server
2. Import or create dashboards for:
   - Request rate (irate on `http_requests_total`)
   - P95/P99 latency (`histogram_quantile` on `http_request_duration_seconds_bucket`)
   - Error rate (5xx / total requests ratio)
   - Active connections

---

## 3. Container Health Checks

Every service in `docker-compose.yml` has a built-in Docker healthcheck:

| Service | Container Name | Healthcheck | Interval |
|---|---|---|---|
| postgres | `lead-automation-db` | `pg_isready -U postgres` | 5s |
| redis | `lead-automation-redis` | `redis-cli ping` | 5s |
| backend | `lead-automation-backend` | health endpoint check (via compose depends_on) | — |
| agent-service | `lead-automation-agent` | HTTP GET `localhost:8000/health` | 10s |

### Check container health

```bash
# List all containers with health status
docker ps --filter health=healthy

# List unhealthy containers only
docker ps --filter health=unhealthy

# Inspect a specific container's health
docker inspect --format='{{json .State.Health}}' lead-automation-db

# Watch health status live
watch -n 2 'docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Health}}"'
```

### Automated container restart

Docker Compose is configured with `restart: unless-stopped`. If a healthcheck fails, the container is NOT automatically restarted by Docker alone. For automatic recovery:

```bash
# Add restart on unhealthy via a simple cron wrapper:
# (already covered by scripts/setup-uptime-monitoring.sh — see below)
docker update --restart=unless-stopped lead-automation-backend
```

---

## 4. External Uptime Monitoring

### Option A: Uptime Kuma (self-hosted)

1. Deploy Uptime Kuma alongside the stack:
   ```yaml
   # Add to docker-compose.yml
   uptime-kuma:
     image: louislam/uptime-kuma:latest
     container_name: lead-automation-uptime
     restart: unless-stopped
     ports:
       - "3002:3001"
     volumes:
       - uptime-kuma-data:/app/data
   ```

2. Open `http://your-server:3002` and create monitors for:
   - `http://localhost:3001/health` (Backend)
   - `http://localhost:3000` (Dashboard)
   - `http://localhost:5678/healthz` (n8n)
   - `http://localhost:8000/health` (Agent Service)
   - `ping://postgres` or TCP on `localhost:5433` (Postgres)
   - `ping://redis` or TCP on `localhost:6379` (Redis)

3. Set up notifications: Telegram, Slack, Email, or Pushover.

### Option B: Better Uptime (SaaS)

1. Sign up at [betteruptime.com](https://betteruptime.com)
2. Add monitors pointing to your public domain:
   - `https://yourdomain.com/health`
   - `https://yourdomain.com/health/ready`
3. Configure heartbeat URL for cron-based alerts:
   - Use `https://betteruptime.com/api/v1/heartbeat/YOUR_HEARTBEAT_KEY`
   - Add to the uptime monitoring script (see below)

### Option C: Simple Cron-based Monitoring (built-in)

Run `scripts/setup-uptime-monitoring.sh` to install a local cron job that pings all services every 5 minutes and alerts on failure. Supports Pushover and Telegram notifications.

```bash
sudo ./scripts/setup-uptime-monitoring.sh
```

---

## 5. Backup Monitoring

Backup jobs log to `/var/log/leadauto-backup.log`. To monitor backup success:

```bash
# Check last backup timestamp
tail -5 /var/log/leadauto-backup.log

# Alert if no backup in 36 hours (add to cron)
#!/bin/bash
LAST=$(stat -c %Y /opt/lead-automation/backups/db_*.dump 2>/dev/null | sort -rn | head -1)
NOW=$(date +%s)
if [ $((NOW - LAST)) -gt $((36 * 3600)) ]; then
  curl -s "https://betteruptime.com/api/v1/heartbeat/YOUR_KEY/incident"
fi
```

---

## 6. Log Aggregation

All services log to Docker's json-file driver by default:

```bash
# Follow all container logs
docker compose logs -f --tail=50

# Follow a specific service
docker compose logs -f backend

# Search for errors
docker compose logs backend | grep -i error
```

For production, consider adding the `gelf` or `fluentd` log driver to docker-compose.yml to ship logs to a central aggregator (Grafana Loki, DataDog, etc.).

---

## Quick Reference

```bash
# Everything healthy?
docker ps --filter health=healthy

# Backend responding?
curl -sf http://localhost:3001/health && echo "UP" || echo "DOWN"

# Prometheus metrics?
curl -sf http://localhost:3001/metrics | head -20

# Last backup?
ls -lt /opt/lead-automation/backups/ | head -5

# Container resource usage?
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}"
```
