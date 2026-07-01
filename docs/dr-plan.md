# Disaster Recovery Plan

## Overview

**RTO (Recovery Time Objective):** 4 hours
**RPO (Recovery Point Objective):** 1 hour (with WAL archiving) / 24 hours (without)

## Failure Scenarios

### 1. Application Crash
- **Detection:** Health check fails, Sentry alert
- **Response:** Auto-restart via Docker restart policy
- **Recovery:** Restart service, verify `/health/ready`
- **RTO:** < 5 minutes

### 2. Database Failure
- **Detection:** Application errors, health check fails
- **Response:** Check Postgres logs, verify disk space
- **Recovery:** 
  1. Restart Postgres container
  2. If corrupted: restore from latest backup
  3. Apply any outstanding WAL archives
- **RTO:** < 30 minutes (restart) / < 2 hours (restore from backup)

### 3. Complete Server Failure
- **Detection:** Uptime monitoring alert
- **Response:** Provision new server from infrastructure template
- **Recovery:**
  1. Spin up new server with Docker Compose
  2. Restore Postgres from S3 backup
  3. Restore uploads from S3 backup
  4. Start services, verify health
  5. Update DNS records
- **RTO:** < 4 hours

### 4. Data Corruption
- **Detection:** User reports data issues, audit logs show anomalies
- **Response:** Stop all services immediately
- **Recovery:**
  1. Restore database from S3 backup to point before corruption
  2. Replay WAL archives to minimize data loss
  3. Start services in read-only mode first
  4. Verify data integrity, switch to read-write
- **RTO:** < 2 hours

## Backup Verification

Monthly restore drill: restore backup to staging environment and verify:
1. `SELECT count(*)` on all major tables matches expected
2. Health checks pass
3. Test login flow works
4. Test a webhook endpoint processes correctly

## Failover Strategy

For multi-region deployments (future):
- Active-passive setup with replicated Postgres
- DNS failover via Route 53 / Cloudflare
- Automated health checks trigger failover after 3 consecutive failures
- Failover time: < 5 minutes with warm standby
