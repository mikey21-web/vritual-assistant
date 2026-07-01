# Contributing

## Development Setup

1. Clone the repo
2. Copy `.env.example` to `.env` and fill in required values
3. Run `docker-compose up -d postgres redis` to start dependencies
4. Run `npm run dev` from the backend directory
5. Run `npm run dev` from the dashboard-v2 directory

## Code Standards

- TypeScript strict mode enabled
- NestJS backend with Prisma ORM
- React 19 frontend with Tailwind CSS v4
- All new features require tests
- Follow existing code patterns

## PR Process

1. Create a feature branch from `master`
2. Write tests for new functionality
3. Ensure all existing tests pass: `npm test`
4. Run verification: `node scripts/verify-production.js`
5. Submit PR with clear description of changes

## Commit Messages

Use conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`
