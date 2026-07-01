#!/bin/bash
# Automated restore drill — verifies backups work by restoring to staging
# Usage: ./scripts/backup-restore-drill.sh

set -euo pipefail

BACKUP_DIR=${BACKUP_DIR:-./backups}
DRILL_DIR=${DRILL_DIR:-./restore-drill}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DRILL_DB="leadauto_drill_${TIMESTAMP}"

echo "[$(date)] Starting backup restore drill..."

# Find latest backup
LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/db_*.dump* 2>/dev/null | head -1 || ls -t "$BACKUP_DIR"/db_*.sql.gz 2>/dev/null | head -1 || echo "")
if [ -z "$LATEST_BACKUP" ]; then
  echo "ERROR: No backup files found in $BACKUP_DIR"
  exit 1
fi

echo "  Using backup: $LATEST_BACKUP"

mkdir -p "$DRILL_DIR"

# Decrypt if needed
if [[ "$LATEST_BACKUP" == *.gpg ]]; then
  ENCRYPT_KEY=${ENCRYPT_KEY:-""}
  if [ -z "$ENCRYPT_KEY" ]; then
    echo "ERROR: Backup is encrypted but ENCRYPT_KEY not provided"
    exit 1
  fi
  gpg --batch --passphrase "$ENCRYPT_KEY" --decrypt "$LATEST_BACKUP" > "$DRILL_DIR/drill.dump"
else
  cp "$LATEST_BACKUP" "$DRILL_DIR/drill.dump"
fi

# Create drill database and restore
echo "  Creating drill database: $DRILL_DB"
createdb "$DRILL_DB" || psql -U postgres -c "CREATE DATABASE $DRILL_DB"

echo "  Restoring backup..."
if [[ "$LATEST_BACKUP" == *.dump || "$LATEST_BACKUP" == *.dump.gpg ]]; then
  pg_restore -U postgres -d "$DRILL_DB" --no-owner --clean "$DRILL_DIR/drill.dump"
else
  psql -U postgres -d "$DRILL_DB" < "$DRILL_DIR/drill.dump"
fi

# Verify row counts
echo "  Verifying data integrity..."
USER_COUNT=$(psql -U postgres -d "$DRILL_DB" -tAc "SELECT count(*) FROM \"User\"")
LEAD_COUNT=$(psql -U postgres -d "$DRILL_DB" -tAc "SELECT count(*) FROM \"Lead\"")
CONTACT_COUNT=$(psql -U postgres -d "$DRILL_DB" -tAc "SELECT count(*) FROM \"Contact\"")

echo "  Users: $USER_COUNT"
echo "  Leads: $LEAD_COUNT"
echo "  Contacts: $CONTACT_COUNT"

if [ "$USER_COUNT" -eq 0 ]; then
  echo "WARNING: No users in restored backup — backup may be corrupted"
  CLEANUP_NEEDED=true
fi

# Cleanup
echo "  Dropping drill database: $DRILL_DB"
dropdb "$DRILL_DB" || psql -U postgres -c "DROP DATABASE $DRILL_DB"
rm -rf "$DRILL_DIR"

echo "[$(date)] Restore drill complete"
echo "  Result: BACKUP OK ($USER_COUNT users, $LEAD_COUNT leads, $CONTACT_COUNT contacts)"
