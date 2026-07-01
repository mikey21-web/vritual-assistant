#!/bin/bash
# Production backup script for lead automation platform
# Usage: ./scripts/backup.sh [--s3-bucket BUCKET] [--encrypt-key KEY]

set -euo pipefail

BACKUP_DIR=${BACKUP_DIR:-./backups}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_NAME=${DB_NAME:-lead_automation}
DB_USER=${DB_USER:-postgres}
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
ENCRYPT_KEY=${ENCRYPT_KEY:-""}
S3_BUCKET=${S3_BUCKET:-""}
RETENTION_DAYS=${RETENTION_DAYS:-7}

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting backup..."

# ---- Database dump (custom format for PITR) ----
DB_FILE="$BACKUP_DIR/db_${TIMESTAMP}.dump"
PGPASSWORD=${PGPASSWORD:-} pg_dump \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  --format=custom \
  --compress=9 \
  --file="$DB_FILE"
echo "  Database dumped (custom format): $DB_FILE ($(stat -c%s "$DB_FILE" 2>/dev/null || stat -f%z "$DB_FILE" 2>/dev/null) bytes)"

# ---- Uploads archive ----
if [ -d "./uploads" ]; then
  UPLOADS_FILE="$BACKUP_DIR/uploads_${TIMESTAMP}.tar.gz"
  tar -czf "$UPLOADS_FILE" ./uploads/
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
