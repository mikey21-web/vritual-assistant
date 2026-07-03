#!/usr/bin/env bash
set -euo pipefail

# ──────────────────────────────────────────────
# lead-automation VPS setup — run this ON the VPS
# Usage: bash <(curl -fsSL https://raw.githubusercontent.com/.../deploy-vps.sh)
#   or scp scripts/deploy-vps.sh root@<vps-ip>:~/ && ssh root@<vps-ip> bash deploy-vps.sh
# ──────────────────────────────────────────────

REPO_URL="https://github.com/mikey21-web/vritual-assistant.git"
DOMAIN="deploysafe.in"
ENV_FILE=".env"

# ─── Colors ───
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn()  { echo -e "${YELLOW}[!]${NC} $1"; }
err()   { echo -e "${RED}[✗]${NC} $1"; }

# ─── 1. System updates ───
info "Updating system packages..."
apt-get update -qq && apt-get upgrade -y -qq

# ─── 2. Swap (safe for any RAM size) ───
if ! swapon --show | grep -q .; then
  info "Creating 2GB swap..."
  fallocate -l 2G /swapfile && chmod 600 /swapfile
  mkswap /swapfile && swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# ─── 3. Docker ───
if ! command -v docker &>/dev/null; then
  info "Installing Docker..."
  curl -fsSL https://get.docker.com | bash
  systemctl enable --now docker
fi

if ! command -v docker-compose &>/dev/null; then
  info "Installing Docker Compose plugin..."
  apt-get install -y -qq docker-compose-plugin
fi

# ─── 4. Caddy (reverse proxy + SSL) ───
if ! command -v caddy &>/dev/null; then
  info "Installing Caddy..."
  apt-get install -y -qq debian-keyring debian-archive-keyring apt-transport-https
  curl -fsSL https://dl.cloudsmith.io/public/caddy/stable/gpg.key | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  echo "deb [signed-by=/usr/share/keyrings/caddy-stable-archive-keyring.gpg] https://dl.cloudsmith.io/public/caddy/stable/deb/debian any-version main" | tee /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -qq && apt-get install -y -qq caddy
  systemctl enable --now caddy
fi

# ─── 5. Clone / pull project ───
if [ -d /opt/lead-automation ]; then
  cd /opt/lead-automation
  info "Pulling latest code..."
  git pull
else
  info "Cloning repository..."
  mkdir -p /opt
  git clone "$REPO_URL" /opt/lead-automation
  cd /opt/lead-automation
fi

# ─── 6. Create .env (skip if exists) ───
if [ ! -f "$ENV_FILE" ]; then
  warn "Creating $ENV_FILE — REQUIRED: edit it before starting!"
  cat > "$ENV_FILE" <<EOF
POSTGRES_PASSWORD=change-me-strong-password
JWT_SECRET=change-me-jwt-secret-32-chars-min
INTEGRATIONS_ENC_KEY=change-me-integrations-enc-key-32
N8N_PASSWORD=change-me-n8n-password
AGENT_SERVICE_JWT=change-me-agent-jwt
AGENT_INBOUND_KEY=change-me-agent-inbound-key
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxx
SEED_OWNER_EMAIL=admin@example.com
SEED_OWNER_PASSWORD=change-me-admin-password
# Domain / reverse-proxy wiring (same-origin under $DOMAIN)
CORS_ORIGIN=https://$DOMAIN
N8N_HOST=$DOMAIN
N8N_PROTOCOL=https
N8N_WEBHOOK_URL=https://$DOMAIN/n8n/
N8N_PATH=/n8n/
N8N_PROXY_HOPS=1
EOF
else
  info "$ENV_FILE already exists — keeping it"
fi

# ─── 7. Firewall ───
info "Configuring firewall (ufw)..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP (Caddy)
ufw allow 443/tcp   # HTTPS (Caddy)
ufw --force enable

# ─── 8. Caddy config ───
info "Writing Caddyfile..."
cat > /etc/caddy/Caddyfile <<CADDY
{
    # Disable HTTP/3 (QUIC/UDP): several mobile carriers (notably in India)
    # throttle or silently drop UDP/443, which makes browsers hang forever
    # trying to upgrade via the Alt-Svc header instead of falling back to TCP.
    servers {
        protocols h1 h2
    }
}

$DOMAIN {
    encode gzip
    tls admin@$DOMAIN
    # Everything is same-origin under path prefixes (stripped before proxying):
    #   /api/*  -> backend (serves /auth/login, /health without a prefix)
    #   /n8n/*  -> n8n (configured with N8N_PATH=/n8n/)
    #   else    -> dashboard SPA
    handle_path /api/* {
        reverse_proxy localhost:3001
    }
    handle_path /n8n/* {
        reverse_proxy localhost:5678
    }
    handle {
        reverse_proxy localhost:3000
    }
}
CADDY
systemctl reload caddy || true

# ─── 9. Start the stack ───
info "Building and starting services..."
cd /opt/lead-automation
docker compose up -d --build

# ─── 10. Show status ───
echo ""
info "Deployment complete!"
echo ""
docker compose ps
echo ""
echo "── URLs ─────────────────────────────"
echo "  Dashboard:  https://$DOMAIN"
echo "  API:        https://$DOMAIN/api"
echo "  n8n:        https://$DOMAIN/n8n/"
echo "─────────────────────────────────────"
echo ""
echo -e "${YELLOW}IMPORTANT: Edit /opt/lead-automation/.env with real secrets before using!${NC}"
