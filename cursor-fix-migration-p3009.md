# Fix: P3009 Failed Migration Blocking Vercel Build

## The Problem
Migration `20260323999999_add_missing_partner_notify_columns` is marked as "failed" in the Supabase `_prisma_migrations` table. Prisma P3009 error blocks ALL deployments until resolved.

Error:
```
Error: P3009
migrate found failed migrations in the target database
The `20260323999999_add_missing_partner_notify_columns` migration started at 2026-03-24 03:34:55.632907 UTC failed
```

## Fix — Two Parts

### Part 1: Update safe-migrate.cjs

In `scripts/safe-migrate.cjs`, before the `prisma migrate deploy` block, add logic to auto-resolve any failed migrations:

```js
// Before running migrate deploy, resolve any failed migrations
const { execSync } = require('child_process');

try {
  // Check for failed migrations and resolve them
  const result = execSync('node scripts/prisma-env.js prisma migrate status 2>&1', { encoding: 'utf8' });
  
  // Extract failed migration names and resolve each
  const failedPattern = /migration `(\w+)` .* failed/g;
  let match;
  while ((match = failedPattern.exec(result)) !== null) {
    const migrationName = match[1];
    console.log(`Resolving failed migration: ${migrationName}`);
    try {
      execSync(`node scripts/prisma-env.js prisma migrate resolve --rolled-back ${migrationName}`, { 
        encoding: 'utf8',
        stdio: 'inherit'
      });
    } catch (e) {
      console.log(`Could not auto-resolve ${migrationName}, continuing...`);
    }
  }
} catch (e) {
  // migrate status failing is not a blocker
}
```

### Part 2: Replace the Failed Migration

Delete the file:
`prisma/migrations/20260323999999_add_missing_partner_notify_columns/migration.sql`

Create a new migration with timestamp `20260324000001_add_partner_notify_columns` using `IF NOT EXISTS` / `DO $$ ... END` pattern so it's idempotent and won't fail if columns already exist:

```sql
-- Add notification preference columns to partners table (idempotent)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'partners' AND column_name = 'notify_on_enrollment'
  ) THEN
    ALTER TABLE "partners" ADD COLUMN "notify_on_enrollment" BOOLEAN NOT NULL DEFAULT true;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'partners' AND column_name = 'notify_on_course'
  ) THEN
    ALTER TABLE "partners" ADD COLUMN "notify_on_course" BOOLEAN NOT NULL DEFAULT false;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'partners' AND column_name = 'notify_on_certified'
  ) THEN
    ALTER TABLE "partners" ADD COLUMN "notify_on_certified" BOOLEAN NOT NULL DEFAULT true;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'partners' AND column_name = 'notify_on_placed'
  ) THEN
    ALTER TABLE "partners" ADD COLUMN "notify_on_placed" BOOLEAN NOT NULL DEFAULT true;
  END IF;
END $$;
```

Also update `prisma/schema.prisma` to make sure the `Partner` model includes these 4 fields if they aren't already there:
```prisma
notifyOnEnrollment Boolean @default(true)
notifyOnCourse     Boolean @default(false)
notifyOnCertified  Boolean @default(true)
notifyOnPlaced     Boolean @default(true)
```

### Part 3: Commit and Push

After making both changes, commit with message:
`fix: replace failed migration with idempotent version, auto-resolve failed migrations in safe-migrate`

## Definition of Done
- [ ] Old failed migration file deleted
- [ ] New idempotent migration created at `20260324000001_add_partner_notify_columns`
- [ ] safe-migrate.cjs auto-resolves failed migrations before deploy
- [ ] Prisma schema updated with 4 notify columns on Partner model
- [ ] Pushed to branch `sprint-6-meeting-feedback`
- [ ] Vercel build succeeds (no P3009 error)
