#!/bin/bash
# Redis backup script
# Usage: ./scripts/redis-backup.sh [--s3-bucket BUCKET]

set -euo pipefail

BACKUP_DIR=${BACKUP_DIR:-./backups}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REDIS_HOST=${REDIS_HOST:-localhost}
REDIS_PORT=${REDIS_PORT:-6379}
S3_BUCKET=${S3_BUCKET:-""}

mkdir -p "$BACKUP_DIR"

# Trigger Redis to dump current data to disk
docker exec lead-automation-redis redis-cli BGSAVE || redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" BGSAVE

# Wait for dump to complete
sleep 3

# Copy RDB dump
REDIS_FILE="$BACKUP_DIR/redis_${TIMESTAMP}.rdb"
docker cp lead-automation-redis:/data/dump.rdb "$REDIS_FILE" 2>/dev/null || \
  cp /var/lib/redis/dump.rdb "$REDIS_FILE" 2>/dev/null || \
  echo "WARNING: Could not copy RDB file (may need docker exec access)"

if [ -f "$REDIS_FILE" ]; then
  echo "  Redis backup: $REDIS_FILE ($(stat -c%s "$REDIS_FILE" 2>/dev/null || stat -f%z "$REDIS_FILE" 2>/dev/null) bytes)"

  # Ship to S3 if configured
  if [ -n "$S3_BUCKET" ] && command -v aws &> /dev/null; then
    aws s3 cp "$REDIS_FILE" "s3://${S3_BUCKET}/backups/redis_${TIMESTAMP}.rdb" --no-progress
    echo "  Shipped to s3://${S3_BUCKET}/backups/"
  fi

  # Rotate (keep 7 days)
  find "$BACKUP_DIR" -name "redis_*" -mtime +7 -delete 2>/dev/null || true
fi

echo "[$(date)] Redis backup complete"
