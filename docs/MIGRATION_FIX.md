# Fix Failed Migration (P3018)

If Vercel deploy fails with:

```
Error: P3018
A migration failed to apply. New migrations cannot be applied before the error is recovered from.
Migration name: 20260320100000_employer_portal_jobs
```

The production database has the migration marked as **failed**. You must resolve it before redeploying.

## Steps

1. **Get your production database URL** from Vercel:
   - Project → Settings → Environment Variables
   - Copy `POSTGRES_PRISMA_URL` (or `DATABASE_URL`)

2. **Run the resolve script locally** (one-time):
   ```bash
   POSTGRES_PRISMA_URL="postgresql://user:pass@host:5432/db?sslmode=require" npm run db:migrate:resolve-failed
   ```

3. **Redeploy** on Vercel. The build will retry the migration and it should succeed.

## What this does

`prisma migrate resolve --rolled-back` marks the failed migration as "rolled back" in the `_prisma_migrations` table. The next `prisma migrate deploy` (during build) will then apply it again with the corrected SQL.
