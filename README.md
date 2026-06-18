# Lead Automation Virtual Assistant

Production-ready lead automation system. The client manages campaigns, forms, QR codes, message templates, scoring rules, lead routing, CRM mapping, and booking settings from the dashboard without developer intervention.

## Architecture

```
Dashboard (React/Next.js) → controls settings
Backend (NestJS) → stores and protects rules
PostgreSQL → source of truth  
Redis + BullMQ → job queues
n8n → executes reusable automations
External → WhatsApp, CRM, Calendar, Payments, Email
```

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 20+

### Setup

1. Copy `.env.example` to `.env`

```bash
cp .env.example .env
```

2. Start infrastructure with Docker Compose

```bash
docker compose up -d postgres redis
```

3. Install backend dependencies

```bash
cd backend && npm install
```

4. Run Prisma migrations

```bash
npx prisma migrate dev --name init
npx prisma generate
```

5. Seed the database

```bash
npx prisma db seed
```

6. Start the backend

```bash
npm run start:dev
```

7. Start the dashboard

```bash
cd ../dashboard && npm install && npm run dev
```

8. Open http://localhost:3000

### Default Login

- Email: `owner@example.com`
- Password: `admin123`

## API Documentation

Swagger docs available at http://localhost:3001/api

## Production Deployment

```bash
docker compose up -d
```

Services:
- Backend: http://localhost:3001
- Dashboard: http://localhost:3000
- n8n: http://localhost:5678
- PostgreSQL: localhost:5432
- Redis: localhost:6379

## Project Structure

```
.
├── backend/         # NestJS API server
│   ├── src/         # 20+ modules
│   └── prisma/      # Database schema & migrations
├── dashboard/       # React/Next.js client dashboard
├── n8n/             # Reusable automation workflows
└── docs/            # Documentation
```

## Core Principle

**The client changes business rules in the dashboard. The backend stores and protects those rules. n8n executes those rules. The database remembers everything.**
