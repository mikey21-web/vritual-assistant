#!/bin/bash
# Lead Automation Stack - One-shot deployment script
# Run on Oracle Cloud free tier (or any Ubuntu 22.04 VPS with 4GB+ RAM)
# Total time: ~10-15 minutes

set -e

echo "==> Updating system"
sudo apt update && sudo apt upgrade -y

echo "==> Installing Docker"
sudo apt install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

echo "==> Adding user to docker group"
sudo usermod -aG docker $USER
newgrp docker

echo "==> Configuring firewall"
sudo apt install -y ufw
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

echo "==> Cloning repo"
cd ~
git clone https://github.com/mikey21-web/vritual-assistant.git lead-automation
cd lead-automation

echo "==> Generating secrets"
JWT_SECRET=$(openssl rand -hex 32)
SIGNED_URL_SECRET=$(openssl rand -hex 32)
AGENT_SERVICE_JWT=$(openssl rand -hex 32)
AGENT_INBOUND_KEY=$(openssl rand -hex 32)
POSTGRES_PASSWORD=$(openssl rand -hex 24)
N8N_PASSWORD=$(openssl rand -hex 16)
SEED_OWNER_PASSWORD=$(openssl rand -hex 16)
INTEGRATIONS_ENC_KEY=$(openssl rand -hex 16)

echo "==> Creating .env file"
cat > .env << EOF
POSTGRES_USER=postgres
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
POSTGRES_DB=lead_automation

JWT_SECRET=${JWT_SECRET}
SIGNED_URL_SECRET=${SIGNED_URL_SECRET}
JWT_EXPIRATION=24h

N8N_PASSWORD=${N8N_PASSWORD}
N8N_BASIC_AUTH_USER=admin

AGENT_SERVICE_JWT=${AGENT_SERVICE_JWT}
AGENT_INBOUND_KEY=${AGENT_INBOUND_KEY}
ANTHROPIC_API_KEY=sk-ant-REPLACE-WITH-REAL-KEY
AGENT_MODEL=claude-sonnet-4-6

SEED_OWNER_EMAIL=admin@localhost
SEED_OWNER_PASSWORD=${SEED_OWNER_PASSWORD}

INTEGRATIONS_ENC_KEY=${INTEGRATIONS_ENC_KEY}
EOF

echo "==> IMPORTANT: Edit .env and add your real ANTHROPIC_API_KEY"
echo "    nano .env"
echo ""
read -p "Press Enter after you've added your Anthropic API key..."

echo "==> Starting stack"
docker compose up -d --build

echo "==> Waiting for services to be healthy"
sleep 30

echo "==> Running database migration"
docker compose exec backend npx prisma migrate deploy

echo "==> Seeding initial admin user"
docker compose exec backend node dist/prisma/seed.js

echo "==> Checking service health"
docker compose ps

echo ""
echo "==> Deployment complete!"
echo ""
echo "Backend health:    http://YOUR-SERVER-IP:3001/health"
echo "Dashboard:         http://YOUR-SERVER-IP:3000"
echo "n8n workflows:     http://YOUR-SERVER-IP:5678"
echo ""
echo "Admin login:"
echo "  Email:    admin@localhost"
echo "  Password: ${SEED_OWNER_PASSWORD}"
echo ""
echo "Next steps:"
echo "  1. Point your domain DNS A record to: YOUR-SERVER-IP"
echo "  2. Run: sudo certbot --nginx -d yourdomain.com"
echo "  3. Configure WhatsApp Business API credentials in dashboard"
echo "  4. Connect client CRM via dashboard /integrations"
echo ""
echo "Save this password somewhere safe: ${SEED_OWNER_PASSWORD}"