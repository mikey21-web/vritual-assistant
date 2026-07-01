# Database Migration Strategy

## Prisma Migrations

This project uses Prisma Migrations for schema changes.

## Migration Workflow

1. Make schema changes in `prisma/schema.prisma`
2. Generate migration: `npx prisma migrate dev --name <description>`
3. Review the generated SQL in `prisma/migrations/<timestamp>_<name>/migration.sql`
4. Test migration against staging database
5. Commit migration file to git

## Rollback Strategy

Prisma does not have a built-in rollback command. To roll back:

```bash
# Option 1: Revert to previous migration (local dev)
npx prisma migrate resolve --rolled-back <migration_name>

# Option 2: Manual SQL rollback
# Create a down migration SQL file that reverses the changes
# Example: ALTER TABLE ... DROP COLUMN, DROP TABLE, etc.
psql -U postgres -d lead_automation -f <rollback_file>.sql

# Option 3: Database restore from backup
# If rollback is complex, restore from the latest backup
pg_restore -U postgres -d lead_automation --clean backups/db_<date>.dump
```

### Rollback Guidelines

- **Before deploying**: Always take a database backup
- **For simple changes**: Create a down migration SQL file
- **For complex changes**: Restore from backup and re-apply unaffected migrations
- **Never use `prisma migrate reset` in production**

## Shadow Database

For safe migration testing:

```bash
# Configure shadow database in .env
SHADOW_DATABASE_URL=postgresql://postgres:password@localhost:5433/lead_automation_shadow

# Test migration
npx prisma migrate dev --create-only

# Review the SQL, then apply
npx prisma migrate deploy
```

## Deployment Order

1. Deploy migration first: `npx prisma migrate deploy`
2. Verify database health: `GET /health/ready`
3. Deploy new application code
4. Verify application health: `GET /health/deep`

## Safe vs Unsafe Changes

| Safe (no downtime) | Requires Maintenance |
|---|---|
| Adding nullable columns | Removing columns |
| Adding tables | Renaming columns |
| Adding indexes (concurrently) | Changing column types |
| Adding enums (new values only) | Removing tables |
