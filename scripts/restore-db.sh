#!/bin/bash
# Restore a database from a gzipped pg_dump backup.
# Usage:
#   ./scripts/restore-db.sh              # list available backups
#   ./scripts/restore-db.sh <file>        # restore specific backup
#   ./scripts/restore-db.sh --latest      # restore most recent
#   ./scripts/restore-db.sh --latest --dry-run  # preview without executing

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups}"
DRY_RUN=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=true; shift ;;
    --latest)  LATEST=true; shift ;;
    -h|--help) echo "Usage: $0 [<file>|--latest] [--dry-run]"; exit 0 ;;
    *)         BACKUP_FILE="$1"; shift ;;
  esac
done

# ── No args → list ────────────────────────────────────────────
if [ -z "${BACKUP_FILE:-}" ] && [ "${LATEST:-}" != true ]; then
  echo "Available backups in ${BACKUP_DIR}:"
  if ls -1t "$BACKUP_DIR"/db_*.sql.gz 2>/dev/null | head -20; then
    echo ""
    echo "Usage: $0 <filename>  or  $0 --latest"
  else
    echo "  (none found)"
  fi
  exit 0
fi

# ── Resolve latest ────────────────────────────────────────────
if [ "${LATEST:-}" = true ]; then
  BACKUP_FILE=$(ls -t "$BACKUP_DIR"/db_*.sql.gz 2>/dev/null | head -1) || true
  if [ -z "${BACKUP_FILE:-}" ]; then
    echo "ERROR: No backups found in $BACKUP_DIR"
    exit 1
  fi
fi

# ── Validate ──────────────────────────────────────────────────
if [ ! -f "$BACKUP_FILE" ]; then
  echo "ERROR: File not found: $BACKUP_FILE"
  echo "Run '$0' to list available backups."
  exit 1
fi

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-lead_automation}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-}"

echo "Database: $DB_NAME@$DB_HOST:$DB_PORT"
echo "Backup:   $BACKUP_FILE"
echo ""

CMD="gunzip -c \"$BACKUP_FILE\" | PGPASSWORD=\"$DB_PASSWORD\" psql -h \"$DB_HOST\" -p \"$DB_PORT\" -U \"$DB_USER\" -d \"$DB_NAME\""

if [ "$DRY_RUN" = true ]; then
  echo "[DRY-RUN] Would execute: ${CMD/PGPASSWORD=\"$DB_PASSWORD\"/PGPASSWORD=***}"
  echo "[DRY-RUN] No changes made."
  exit 0
fi

echo "Restoring... (this may take a while)"
gunzip -c "$BACKUP_FILE" | PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME"
echo "Restore complete."
