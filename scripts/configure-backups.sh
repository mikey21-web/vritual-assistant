#!/bin/bash
# =============================================================================
# Configure Backup Cron Jobs for Lead Automation Platform
# =============================================================================
# Installs scheduled backup jobs to /etc/cron.d/leadauto-backups
#
# Run: sudo ./scripts/configure-backups.sh
#
# Schedules:
#   - Daily PostgreSQL backup     @ 2:00 AM
#   - Daily Redis backup          @ 2:30 AM
#   - Weekly restore drill        @ 4:00 AM Sunday
#   - Local rotation keeps 7 days of backups
# =============================================================================

set -euo pipefail

# ---- Config ----
BACKUP_DIR="/opt/lead-automation/backups"
CRON_FILE="/etc/cron.d/leadauto-backups"
LOG_FILE="/var/log/leadauto-backup.log"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
COMPOSE_PROJECT_DIR="${COMPOSE_PROJECT_DIR:-/opt/lead-automation}"

# Color helpers
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

info()  { echo -e "${GREEN}[INFO]${NC} $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; }

# ---- Pre-flight checks ----
if [ "$EUID" -ne 0 ]; then
  error "This script must be run as root (sudo)."
  exit 1
fi

if [ ! -f "$SCRIPT_DIR/backup.sh" ]; then
  error "backup.sh not found alongside this script in $SCRIPT_DIR"
  exit 1
fi

if [ ! -f "$SCRIPT_DIR/redis-backup.sh" ]; then
  error "redis-backup.sh not found alongside this script in $SCRIPT_DIR"
  exit 1
fi

# ---- Validate env file ----
ENV_FILE="${COMPOSE_PROJECT_DIR}/.env"
if [ -f "$ENV_FILE" ]; then
  info "Found .env at $ENV_FILE — sourcing for defaults"
  set -a; source "$ENV_FILE"; set +a
elif [ -f "${SCRIPT_DIR}/backup-config.env" ]; then
  ENV_FILE="${SCRIPT_DIR}/backup-config.env"
  info "Found backup config at $ENV_FILE — sourcing"
  set -a; source "$ENV_FILE"; set +a
else
  warn "No .env or backup-config.env found. Using defaults."
  warn "  Create scripts/backup-config.env from scripts/backup-config.env.example"
fi

# ---- Create backup directory ----
mkdir -p "$BACKUP_DIR"
chmod 750 "$BACKUP_DIR"
info "Backup directory ready: $BACKUP_DIR"

# ---- Ensure scripts are executable ----
chmod +x "$SCRIPT_DIR/backup.sh"
chmod +x "$SCRIPT_DIR/redis-backup.sh"
chmod +x "$SCRIPT_DIR/backup-restore-drill.sh"
info "Scripts are executable"

# ---- Write cron file ----
cat > "$CRON_FILE" <<CRON
# /etc/cron.d/leadauto-backups
# Managed by: scripts/configure-backups.sh
# Do NOT edit manually — re-run configure-backups.sh to regenerate.
#
# Environment variables are sourced from ${ENV_FILE} at runtime.
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

# Daily PostgreSQL backup at 2:00 AM
0 2 * * * root cd "${COMPOSE_PROJECT_DIR}" && BACKUP_DIR="${BACKUP_DIR}" COMPOSE_PROJECT_DIR="${COMPOSE_PROJECT_DIR}" bash "${SCRIPT_DIR}/backup.sh" >> "${LOG_FILE}" 2>&1

# Daily Redis backup at 2:30 AM
30 2 * * * root cd "${COMPOSE_PROJECT_DIR}" && BACKUP_DIR="${BACKUP_DIR}" bash "${SCRIPT_DIR}/redis-backup.sh" >> "${LOG_FILE}" 2>&1

# Weekly restore drill on Sunday at 4:00 AM
0 4 * * 0 root cd "${COMPOSE_PROJECT_DIR}" && BACKUP_DIR="${BACKUP_DIR}" bash "${SCRIPT_DIR}/backup-restore-drill.sh" >> "${LOG_FILE}" 2>&1
CRON

chmod 644 "$CRON_FILE"
info "Cron file installed: $CRON_FILE"

# ---- Create log file with rotation ----
touch "$LOG_FILE"
chmod 640 "$LOG_FILE"
info "Log file ready: $LOG_FILE"

# ---- Install logrotate config for backup logs ----
cat > /etc/logrotate.d/leadauto-backups <<'LOGROTATE'
/var/log/leadauto-backup.log {
  monthly
  rotate 12
  compress
  delaycompress
  missingok
  notifempty
  create 640 root root
}
LOGROTATE
info "Logrotate config installed: /etc/logrotate.d/leadauto-backups"

# ---- Verify & reload cron ----
if command -v systemctl &> /dev/null && systemctl is-active --quiet cron; then
  systemctl reload cron
  info "Cron service reloaded"
elif command -v service &> /dev/null; then
  service cron reload 2>/dev/null || service crond reload 2>/dev/null || true
fi

# ---- Summary ----
echo ""
echo "============================================================================="
info "Backup automation configured successfully!"
echo ""
echo "  Backup directory:    $BACKUP_DIR"
echo "  Cron file:           $CRON_FILE"
echo "  Log file:            $LOG_FILE"
echo ""
echo "  Schedule:"
echo "    PostgreSQL backup   Every day    @ 2:00 AM"
echo "    Redis backup        Every day    @ 2:30 AM"
echo "    Restore drill       Every Sunday @ 4:00 AM"
echo ""
echo "  Next steps:"
echo "    1. Set S3 credentials:     nano scripts/backup-config.env"
echo "    2. Set GPG encrypt key:    nano scripts/backup-config.env"
echo "    3. Test a backup:          sudo BACKUP_DIR=$BACKUP_DIR ./scripts/backup.sh"
echo "    4. Test restore drill:     sudo BACKUP_DIR=$BACKUP_DIR ./scripts/backup-restore-drill.sh"
echo "============================================================================="
