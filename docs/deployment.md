# Deployment Guide

## Prerequisites

- Docker 24+ & Docker Compose v2
- Node.js 20+
- Git

## Local Development

### 1. Clone

```bash
git clone <repo-url>
cd virtual-assisant
```

### 2. Environment

```bash
cp .env.example .env
# Edit .env - change JWT_SECRET to a random string
```

### 3. Start Infrastructure

```bash
docker compose up -d postgres redis
```

### 4. Install & Run Backend

```bash
cd backend
npm install --legacy-peer-deps
npx prisma migrate dev --name init
npx prisma db seed
npm run start:dev
```

Backend API: http://localhost:3001
Swagger docs: http://localhost:3001/api

### 5. Install & Run Dashboard

```bash
cd ../dashboard
npm install
npm run dev
```

Dashboard: http://localhost:3000

### 6. n8n (optional)

```bash
docker compose up -d n8n
```

n8n: http://localhost:5678

Import workflows from `n8n/workflows/*.json` via Settings > Import.

## Production Deployment

### Full Stack with Docker Compose

```bash
# Create .env file with production values
DATABASE_URL=postgresql://postgres:STRONG_PASSWORD@postgres:5432/lead_automation
JWT_SECRET=RANDOM_64_CHAR_STRING
N8N_PASSWORD=STRONG_PASSWORD

# Start all services
docker compose up -d

# Run migrations
docker compose exec backend npx prisma migrate deploy

# Seed (first time only)
docker compose exec backend npx prisma db seed
```

### Services

| Service | Port | URL |
|---------|------|-----|
| Dashboard | 3000 | http://localhost:3000 |
| Backend API | 3001 | http://localhost:3001 |
| n8n | 5678 | http://localhost:5678 |
| PostgreSQL | 5432 | localhost:5432 |
| Redis | 6379 | localhost:6379 |

### Health Checks

```bash
# Backend
curl http://localhost:3001/api

# Database
docker compose exec postgres pg_isready

# Redis
docker compose exec redis redis-cli ping
```

### SSL/TLS

Put nginx or Caddy in front for SSL termination. Example Caddyfile:

```
yourdomain.com {
    reverse_proxy localhost:3000
}

api.yourdomain.com {
    reverse_proxy localhost:3001
}
```

### Backups

```bash
# PostgreSQL
docker compose exec postgres pg_dump -U postgres lead_automation > backup.sql

# Restore
cat backup.sql | docker compose exec -T postgres psql -U postgres lead_automation
```

### Media Storage

By default files go to `./uploads/`. For production, set:

```
STORAGE_PROVIDER=s3
S3_BUCKET=your-bucket
S3_REGION=us-east-1
S3_ACCESS_KEY=xxx
S3_SECRET_KEY=xxx
S3_ENDPOINT=https://s3.amazonaws.com
```

### Monitoring

- Backend logs: `docker compose logs -f backend`
- n8n execution logs: http://localhost:5678/executions
- Database: Connect any PostgreSQL client to localhost:5432

### Scaling

- Backend: Increase replicas in docker-compose or use an orchestrator
- n8n: Can run multiple instances with external DB
- PostgreSQL: Use managed service (RDS, Cloud SQL) for production
- Redis: Use managed service (ElastiCache, Memorystore)
