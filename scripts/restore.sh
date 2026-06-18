#!/bin/bash
# Restore from backup
if [ -z "$1" ]; then echo "Usage: ./restore.sh <backup_file.sql.gz>"; exit 1; fi

DB_NAME=${DB_NAME:-lead_automation}
DB_USER=${DB_USER:-postgres}

echo "Restoring $1..."
gunzip -c "$1" | psql -U "$DB_USER" "$DB_NAME"
echo "Restore complete."
