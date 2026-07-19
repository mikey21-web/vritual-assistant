#!/bin/bash
# Database backup — pg_dump → gzip → ./backups/  [+ optional R2 sync]
# Usage: ./scripts/backup-db.sh
#
# Env vars: DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
# Optional R2: R2_ENDPOINT, R2_BUCKET, R2_ACCESS_KEY, R2_SECRET_KEY

set -euo pipefail

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-lead_automation}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-}"

BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/db_${TIMESTAMP}.sql.gz"
LOG_FILE="${BACKUP_DIR}/backup.log"
RETENTION_DAYS=30

mkdir -p "$BACKUP_DIR"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"; }

log "=== Backup start: $DB_NAME@$DB_HOST:$DB_PORT ==="

PGPASSWORD="$DB_PASSWORD" pg_dump \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  --clean --if-exists \
  2>>"$LOG_FILE" \
| gzip > "$BACKUP_FILE"

# shellcheck disable=SC2181
if [ $? -eq 0 ] && [ -s "$BACKUP_FILE" ]; then
  SIZE=$(stat -c%s "$BACKUP_FILE" 2>/dev/null || stat -f%z "$BACKUP_FILE" 2>/dev/null || echo "?")
  log "Backup saved: $(basename "$BACKUP_FILE") (${SIZE}b)"
else
  log "ERROR: pg_dump failed"
  rm -f "$BACKUP_FILE"
  exit 1
fi

# ── R2 / S3 sync ──────────────────────────────────────────────
if [ -n "${R2_ENDPOINT:-}" ] && [ -n "${R2_BUCKET:-}" ]; then
  if command -v rclone &>/dev/null; then
    log "Syncing to R2 via rclone..."
    rclone copy "$BACKUP_FILE" ":s3,access_key=${R2_ACCESS_KEY},secret_key=${R2_SECRET_KEY},region=${R2_REGION:-auto},endpoint=${R2_ENDPOINT}:${R2_BUCKET}/backups/"
    log "R2 sync done"
  elif command -v aws &>/dev/null; then
    log "Syncing to R2 via aws s3..."
    export AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY"
    export AWS_SECRET_ACCESS_KEY="$R2_SECRET_KEY"
    aws s3 cp "$BACKUP_FILE" "s3://${R2_BUCKET}/backups/" --endpoint-url="$R2_ENDPOINT" --no-progress
    log "R2 sync done"
  else
    log "WARN: R2 configured but rclone/aws missing — skip sync"
  fi
fi

# ── Local rotation — 30 days ──────────────────────────────────
find "$BACKUP_DIR" -name "db_*.sql.gz" -mtime "+${RETENTION_DAYS}" -delete 2>/dev/null || true
log "Rotated backups older than ${RETENTION_DAYS}d"

log "=== Backup complete ==="
