#!/bin/bash
# Production backup script for lead automation platform

BACKUP_DIR=${BACKUP_DIR:-./backups}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_NAME=${DB_NAME:-lead_automation}
DB_USER=${DB_USER:-postgres}

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting backup..."

# Database dump
pg_dump -U "$DB_USER" "$DB_NAME" > "$BACKUP_DIR/db_$TIMESTAMP.sql"
gzip "$BACKUP_DIR/db_$TIMESTAMP.sql"
echo "  Database dumped: $BACKUP_DIR/db_$TIMESTAMP.sql.gz"

# Uploads backup
if [ -d "./uploads" ]; then
  tar -czf "$BACKUP_DIR/uploads_$TIMESTAMP.tar.gz" ./uploads/
  echo "  Uploads archived: $BACKUP_DIR/uploads_$TIMESTAMP.tar.gz"
fi

# Rotate: keep last 7 days
find "$BACKUP_DIR" -name "db_*" -mtime +7 -delete
find "$BACKUP_DIR" -name "uploads_*" -mtime +7 -delete

echo "[$(date)] Backup complete. Files in $BACKUP_DIR:"
ls -lh "$BACKUP_DIR"
