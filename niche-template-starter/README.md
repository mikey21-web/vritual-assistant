# Niche Template Starter

A scaffold repository for a new niche deployment of the Core Engine platform.

## 1-Day Spin-Up Runbook

### Prerequisites
- GitHub account
- Your own server with Docker + Docker Compose (or a cloud host)
- A domain name (if deploying publicly)
- WhatsApp Business API credentials (for WhatsApp channel)

### Step 1: Create your repo
```bash
# Create a new repo from this template on GitHub:
# Click "Use this template" → "Create a new repository"
gh repo create my-niche --template <org>/niche-template-starter --private
cd my-niche
```

### Step 2: Edit niche.config.yaml
Edit `niche.config.yaml` to match your business:
- Set `niche.key` to a unique identifier
- Set `niche.industry` and `niche.display_name`
- Configure your pipeline stages, scoring rules, message templates
- Add custom fields, campaigns, booking settings

### Step 3: Set environment secrets
Copy `.env.example` to `.env` and fill in all secrets:
```bash
cp .env.example .env
# Edit .env with your actual credentials
# At minimum: JWT_SECRET, INTEGRATIONS_ENC_KEY, DATABASE_URL
```

### Step 4: Deploy
```bash
docker compose up -d
```

Or push to GitHub and let CI/CD handle deployment:
```bash
git add -A
git commit -m "Initial niche config"
git push origin main
```

### Step 5: Verify
- Dashboard: http://your-server:3000
- API Health: http://your-server:3001/health
- Login with the SEED_OWNER_EMAIL / SEED_OWNER_PASSWORD

## Files
| File | Description |
|------|-------------|
| `niche.config.yaml` | **The only file you edit** — defines your entire niche behavior |
| `.env.example` | Template for secrets (copy to `.env`) |
| `docker-compose.yml` | Runs the full stack locally |
| `.github/workflows/deploy.yml` | CI/CD pipeline for automated deployment |

## Upgrading
Bump `CORE_ENGINE_VERSION` in `.env` to the latest tag, then redeploy:
```bash
docker compose pull
docker compose up -d
```
