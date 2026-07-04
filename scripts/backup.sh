#!/bin/bash
# Production backup script for lead automation platform
# Usage: ./scripts/backup.sh [--s3-bucket BUCKET] [--encrypt-key KEY]
#
# Environment variables (with defaults):
#   BACKUP_DIR, DB_NAME, DB_USER, ENCRYPT_KEY, S3_BUCKET, RETENTION_DAYS
#   PG_CONTAINER_NAME — auto-detected from docker ps if not set
#   COMPOSE_PROJECT_DIR — project root (defaults to PWD)
#   PARTY_PARROT_MODE — set to "true" for extra flair

set -euo pipefail

# ---- Party Parrot Mode ----
# 🦜 PARTY PARROT MODE
if [ "${PARTY_PARROT_MODE:-false}" = "true" ]; then
  echo "🎉 Party Parrot Mode activated! Your backups are flying! 🦜"
  echo "But seriously, your data is being backed up. Relax. 🎉"
fi

BACKUP_DIR=${BACKUP_DIR:-./backups}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_NAME=${DB_NAME:-lead_automation}
DB_USER=${DB_USER:-postgres}
DB_HOST=${DB_HOST:-}
DB_PORT=${DB_PORT:-5432}
ENCRYPT_KEY=${ENCRYPT_KEY:-""}
S3_BUCKET=${S3_BUCKET:-""}
RETENTION_DAYS=${RETENTION_DAYS:-7}
COMPOSE_PROJECT_DIR=${COMPOSE_PROJECT_DIR:-$(pwd)}

# ---- Auto-detect Docker container names ----
# Tries docker-compose ps, then docker ps, then falls back to env vars
detect_container() {
  local service_name="$1"
  local env_override="$2"
  local fallback="$3"

  # Use explicit override if set
  if [ -n "$env_override" ]; then
    echo "$env_override"
    return
  fi

  # Try docker-compose ps (container name format: project_service_1 or project-service-1)
  if command -v docker &> /dev/null; then
    # First check if docker compose is available
    if docker compose version &>/dev/null && [ -f "${COMPOSE_PROJECT_DIR}/docker-compose.yml" ]; then
      local compose_name
      compose_name=$(docker compose -f "${COMPOSE_PROJECT_DIR}/docker-compose.yml" ps --format json 2>/dev/null | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if isinstance(data, list):
        for svc in data:
            if svc.get('Service') == '$service_name' or svc.get('Name', '').find('$service_name') != -1:
                print(svc.get('Name', ''))
                break
    elif isinstance(data, dict):
        for svc in data.values():
            if svc.get('Service') == '$service_name' or svc.get('Name', '').find('$service_name') != -1:
                print(svc.get('Name', ''))
                break
except: pass
" 2>/dev/null || true)
      if [ -n "$compose_name" ]; then
        echo "$compose_name"
        return
      fi
    fi

    # Fallback: docker ps --filter name
    local detected
    detected=$(docker ps --filter "name=${service_name}" --format '{{.Names}}' 2>/dev/null | head -1)
    if [ -n "$detected" ]; then
      echo "$detected"
      return
    fi
  fi

  # Ultimate fallback
  echo "$fallback"
}

PG_CONTAINER=$(detect_container "postgres" "${PG_CONTAINER_NAME:-}" "lead-automation-db")
REDIS_CONTAINER=$(detect_container "redis" "${REDIS_CONTAINER_NAME:-}" "lead-automation-redis")

echo "[$(date)] Starting backup..."
echo "  PostgreSQL container: $PG_CONTAINER"
echo "  Redis container:      $REDIS_CONTAINER"

mkdir -p "$BACKUP_DIR"

# ---- Database dump (custom format for PITR) ----
# Prefer docker exec to pg_dump from inside the container (avoids host dependency)
DB_FILE="$BACKUP_DIR/db_${TIMESTAMP}.dump"
if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^${PG_CONTAINER}$"; then
  echo "  Dumping via docker exec: $PG_CONTAINER"
  docker exec "$PG_CONTAINER" pg_dump \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --format=custom \
    --compress=9 \
    --file="/tmp/db_${TIMESTAMP}.dump"
  docker cp "$PG_CONTAINER:/tmp/db_${TIMESTAMP}.dump" "$DB_FILE"
  docker exec "$PG_CONTAINER" rm -f "/tmp/db_${TIMESTAMP}.dump"
elif command -v pg_dump &> /dev/null; then
  echo "  Dumping via local pg_dump"
  # Auto-detect DB_HOST from docker inspect if not explicitly set
  if [ -z "$DB_HOST" ]; then
    DB_HOST=$(docker inspect "$PG_CONTAINER" 2>/dev/null | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if isinstance(data, list) and len(data) > 0:
        net = data[0].get('NetworkSettings', {}).get('Networks', {})
        for n in net.values():
            ip = n.get('IPAddress', '')
            if ip: print(ip); break
except: pass
" 2>/dev/null || echo "localhost") || echo "localhost"
  fi
  PGPASSWORD=${PGPASSWORD:-} pg_dump \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --format=custom \
    --compress=9 \
    --file="$DB_FILE"
else
  echo "  WARNING: Neither Docker nor pg_dump available. Skipping database dump."
  touch "$DB_FILE"  # placeholder so downstream steps don't error
fi
echo "  Database dumped (custom format): $DB_FILE ($(stat -c%s "$DB_FILE" 2>/dev/null || stat -f%z "$DB_FILE" 2>/dev/null) bytes)"

# ---- Uploads archive ----
UPLOADS_DIR="${COMPOSE_PROJECT_DIR}/uploads"
if [ -d "$UPLOADS_DIR" ]; then
  UPLOADS_FILE="$BACKUP_DIR/uploads_${TIMESTAMP}.tar.gz"
  tar -czf "$UPLOADS_FILE" -C "$(dirname "$UPLOADS_DIR")" "$(basename "$UPLOADS_DIR")"
  echo "  Uploads archived: $UPLOADS_FILE"
fi

# ---- Encrypt backups ----
if [ -n "$ENCRYPT_KEY" ]; then
  echo "  Encrypting backups..."
  gpg --symmetric --batch --passphrase "$ENCRYPT_KEY" --cipher-algo AES256 "$DB_FILE"
  rm -f "$DB_FILE"
  echo "  Database backup encrypted: ${DB_FILE}.gpg"

  if [ -f "$UPLOADS_FILE" ]; then
    gpg --symmetric --batch --passphrase "$ENCRYPT_KEY" --cipher-algo AES256 "$UPLOADS_FILE"
    rm -f "$UPLOADS_FILE"
    echo "  Uploads backup encrypted: ${UPLOADS_FILE}.gpg"
  fi
fi

# ---- Ship to S3 (off-host) ----
if [ -n "$S3_BUCKET" ]; then
  if command -v aws &> /dev/null; then
    echo "  Shipping to S3: s3://$S3_BUCKET/backups/"
    if [ -n "$ENCRYPT_KEY" ]; then
      aws s3 cp "${DB_FILE}.gpg" "s3://${S3_BUCKET}/backups/db_${TIMESTAMP}.dump.gpg" --no-progress
      [ -f "${UPLOADS_FILE}.gpg" ] && aws s3 cp "${UPLOADS_FILE}.gpg" "s3://${S3_BUCKET}/backups/uploads_${TIMESTAMP}.tar.gz.gpg" --no-progress
    else
      aws s3 cp "$DB_FILE" "s3://${S3_BUCKET}/backups/db_${TIMESTAMP}.dump" --no-progress
      [ -f "$UPLOADS_FILE" ] && aws s3 cp "$UPLOADS_FILE" "s3://${S3_BUCKET}/backups/uploads_${TIMESTAMP}.tar.gz" --no-progress
    fi
    echo "  S3 upload complete"
  else
    echo "  WARNING: aws CLI not found. Skipping S3 upload."
  fi
fi

# ---- Rotate: keep last N days ----
find "$BACKUP_DIR" -name "db_*" -mtime "+$RETENTION_DAYS" -delete 2>/dev/null || true
find "$BACKUP_DIR" -name "uploads_*" -mtime "+$RETENTION_DAYS" -delete 2>/dev/null || true
echo "  Rotated backups older than $RETENTION_DAYS days"

echo "[$(date)] Backup complete."
ls -lh "$BACKUP_DIR" 2>/dev/null || true

# ---- WAL archiving reminder ----
if [ ! -f "/etc/postgresql/wal_archive_setup" ]; then
  echo ""
  echo "NOTE: For point-in-time recovery, configure WAL archiving in postgresql.conf:"
  echo "  wal_level = replica"
  echo "  archive_mode = on"
  echo "  archive_command = 'cp %p /backups/wal/%f'"
  echo "  archive_timeout = 300"
fi
