#!/bin/bash
# =============================================================================
# Setup Uptime Monitoring — Local Cron-Based Health Checks
# =============================================================================
# Installs a cron job that pings all platform services every 5 minutes and
# optionally sends alerts via Pushover or Telegram on failure.
#
# Run: sudo ./scripts/setup-uptime-monitoring.sh
#
# Services checked:
#   - Backend (lead-automation-backend, port 3001)
#   - Dashboard (lead-automation-dashboard, port 3000)
#   - n8n (lead-automation-n8n, port 5678)
#   - Agent Service (lead-automation-agent, port 8000)
#   - PostgreSQL (lead-automation-db, port 5433)
#   - Redis (lead-automation-redis, port 6379)
# =============================================================================

set -euo pipefail

# ---- Config ----
CRON_FILE="/etc/cron.d/leadauto-uptime"
LOG_FILE="/var/log/leadauto-uptime.log"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
COMPOSE_PROJECT_DIR="${COMPOSE_PROJECT_DIR:-/opt/lead-automation}"

# Color helpers
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${GREEN}[INFO]${NC} $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; }

# ---- Pre-flight ----
if [ "$EUID" -ne 0 ]; then
  error "This script must be run as root (sudo)."
  exit 1
fi

# Source backup config if it exists (for Pushover/Telegram tokens)
ENV_FILE="${SCRIPT_DIR}/backup-config.env"
if [ -f "$ENV_FILE" ]; then
  set -a; source "$ENV_FILE"; set +a
  info "Sourced $ENV_FILE for alert config"
fi

# ---- Create the uptime check script ----
UPTIME_SCRIPT="/usr/local/bin/leadauto-uptime-check.sh"

cat > "$UPTIME_SCRIPT" <<'UPTIME_SCRIPT'
#!/bin/bash
# =============================================================================
# Lead Automation Uptime Check — invoked by cron every 5 minutes
# =============================================================================
# Checks all platform services and sends alerts on failures.
#
# Configure alerts via environment variables (sourced from backup-config.env):
#   PUSHOVER_USER_KEY / PUSHOVER_APP_TOKEN — Pushover push notifications
#   TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID  — Telegram bot alerts
#   BETTER_UPTIME_HEARTBEAT_KEY            — Better Uptime heartbeat URL
# =============================================================================

set -euo pipefail

LOG_FILE="/var/log/leadauto-uptime.log"
FAILURES=""
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Source external config (if available)
CONFIG_FILES=(
  "/opt/lead-automation/.env"
  "/opt/lead-automation/scripts/backup-config.env"
)
for f in "${CONFIG_FILES[@]}"; do
  [ -f "$f" ] && set -a && source "$f" && set +a 2>/dev/null || true
done

log() {
  echo "[$TIMESTAMP] $*" >> "$LOG_FILE"
}

alert_pushover() {
  local title="$1"
  local message="$2"
  if [ -n "${PUSHOVER_USER_KEY:-}" ] && [ -n "${PUSHOVER_APP_TOKEN:-}" ]; then
    curl -s -o /dev/null \
      --form-string "token=$PUSHOVER_APP_TOKEN" \
      --form-string "user=$PUSHOVER_USER_KEY" \
      --form-string "title=$title" \
      --form-string "message=$message" \
      --form-string "priority=1" \
      https://api.pushover.net/1/messages.json
  fi
}

alert_telegram() {
  local message="$1"
  if [ -n "${TELEGRAM_BOT_TOKEN:-}" ] && [ -n "${TELEGRAM_CHAT_ID:-}" ]; then
    curl -s -o /dev/null \
      "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
      -d "chat_id=${TELEGRAM_CHAT_ID}" \
      -d "text=${message}" \
      -d "parse_mode=HTML" >/dev/null 2>&1
  fi
}

alert_betteruptime() {
  local status="$1"  # "up" or "down"
  if [ -n "${BETTER_UPTIME_HEARTBEAT_KEY:-}" ]; then
    if [ "$status" = "up" ]; then
      curl -s -o /dev/null "https://betteruptime.com/api/v1/heartbeat/${BETTER_UPTIME_HEARTBEAT_KEY}"
    else
      curl -s -o /dev/null "https://betteruptime.com/api/v1/heartbeat/${BETTER_UPTIME_HEARTBEAT_KEY}/incident"
    fi
  fi
}

check_http() {
  local name="$1"
  local url="$2"
  local status_code
  status_code=$(curl -sf -o /dev/null -w "%{http_code}" --max-time 10 "$url" 2>/dev/null || echo "000")
  if [ "$status_code" = "000" ] || [ "$status_code" -ge 500 ]; then
    log "FAIL: $name — HTTP $status_code ($url)"
    FAILURES="${FAILURES}❌ <b>${name}</b>: HTTP ${status_code}\n"
    return 1
  else
    log "OK:   $name — HTTP $status_code ($url)"
    return 0
  fi
}

check_docker() {
  local name="$1"
  local container="$2"
  if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^${container}$"; then
    local status
    status=$(docker inspect --format='{{.State.Status}}' "$container" 2>/dev/null || echo "unknown")
    if [ "$status" = "running" ]; then
      log "OK:   $name — container $container is $status"
      return 0
    else
      log "FAIL: $name — container $container is $status"
      FAILURES="${FAILURES}❌ <b>${name}</b>: container ${container} is ${status}\n"
      return 1
    fi
  else
    log "WARN: $name — container $container not found"
    FAILURES="${FAILURES}⚠️ <b>${name}</b>: container ${container} not found\n"
    return 1
  fi
}

# =============================================================================
# Main Checks
# =============================================================================

log "=== Uptime Check ==="

# HTTP health endpoints
check_http "Backend"       "http://localhost:3001/health"
check_http "Dashboard"     "http://localhost:3000"
check_http "n8n"           "http://localhost:5678/healthz"
check_http "Agent Service" "http://localhost:8000/health"

# Docker container status
check_docker "PostgreSQL"     "lead-automation-db"
check_docker "Redis"          "lead-automation-redis"
check_docker "Backend (Docker)" "lead-automation-backend"
check_docker "Dashboard (Docker)" "lead-automation-dashboard"
check_docker "n8n (Docker)"     "lead-automation-n8n"
check_docker "Agent (Docker)"   "lead-automation-agent"

# =============================================================================
# Alerting
# =============================================================================

if [ -n "$FAILURES" ]; then
  SUMMARY="🚨 <b>Lead Automation — Service Outage</b>\n\nDetected at: ${TIMESTAMP}\n\n${FAILURES}\nHost: $(hostname)"
  log "ALERT: Failures detected — sending notifications"
  echo -e "$SUMMARY" >> "$LOG_FILE"

  alert_pushover "🚨 Lead Automation Outage" "$(echo -e "$FAILURES" | sed 's/<[^>]*>//g')"
  alert_telegram "$SUMMARY"
  alert_betteruptime "down"
else
  log "OK:   All services healthy"
  alert_betteruptime "up"
fi

log "=== End Check ==="
echo "" >> "$LOG_FILE"
UPTIME_SCRIPT

chmod +x "$UPTIME_SCRIPT"
info "Uptime check script installed: $UPTIME_SCRIPT"

# ---- Install cron job ----
cat > "$CRON_FILE" <<CRON
# /etc/cron.d/leadauto-uptime
# Managed by: scripts/setup-uptime-monitoring.sh
# Do NOT edit manually — re-run the setup script to regenerate.
#
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

# Check all services every 5 minutes
*/5 * * * * root bash "${UPTIME_SCRIPT}" 2>&1 | tail -1 >> "${LOG_FILE}" || true
CRON

chmod 644 "$CRON_FILE"
info "Cron file installed: $CRON_FILE"

# ---- Create log file ----
touch "$LOG_FILE"
chmod 640 "$LOG_FILE"
info "Log file ready: $LOG_FILE"

# ---- Install logrotate config ----
cat > /etc/logrotate.d/leadauto-uptime <<'LOGROTATE'
/var/log/leadauto-uptime.log {
  weekly
  rotate 8
  compress
  delaycompress
  missingok
  notifempty
  create 640 root root
}
LOGROTATE
info "Logrotate config installed: /etc/logrotate.d/leadauto-uptime"

# ---- Reload cron ----
if command -v systemctl &> /dev/null && systemctl is-active --quiet cron; then
  systemctl reload cron
  info "Cron service reloaded"
elif command -v service &> /dev/null; then
  service cron reload 2>/dev/null || service crond reload 2>/dev/null || true
fi

# ---- Test run ----
info "Running initial uptime check..."
bash "$UPTIME_SCRIPT" || true
echo ""
tail -5 "$LOG_FILE"

# ---- Summary ----
echo ""
echo "============================================================================="
info "Uptime monitoring configured successfully!"
echo ""
echo "  Cron interval:     Every 5 minutes"
echo "  Check script:      $UPTIME_SCRIPT"
echo "  Cron file:         $CRON_FILE"
echo "  Log file:          $LOG_FILE"
echo ""
echo "  Services monitored:"
echo "    - Backend (HTTP :3001/health)"
echo "    - Dashboard (HTTP :3000)"
echo "    - n8n (HTTP :5678/healthz)"
echo "    - Agent Service (HTTP :8000/health)"
echo "    - PostgreSQL (container health)"
echo "    - Redis (container health)"
echo ""
echo "  Alert channels configured:"
if [ -n "${PUSHOVER_USER_KEY:-}" ]; then
  echo "    ✅ Pushover"
else
  echo "    ⬜ Pushover (not configured — set PUSHOVER_USER_KEY in backup-config.env)"
fi
if [ -n "${TELEGRAM_BOT_TOKEN:-}" ]; then
  echo "    ✅ Telegram"
else
  echo "    ⬜ Telegram (not configured — set TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID)"
fi
if [ -n "${BETTER_UPTIME_HEARTBEAT_KEY:-}" ]; then
  echo "    ✅ Better Uptime"
else
  echo "    ⬜ Better Uptime (not configured — set BETTER_UPTIME_HEARTBEAT_KEY)"
fi
echo ""
echo "  To test an alert:  sudo bash $UPTIME_SCRIPT"
echo "  To view logs:      tail -f $LOG_FILE"
echo "============================================================================="
