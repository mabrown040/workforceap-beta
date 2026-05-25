# WORKING.md

Notes for developers working on WorkforceAP.

## Notification System (Phase 2 – 2026-03-20)

Seven missing notifications have been implemented:

1. **Application Accepted** – Sent when admin approves application
2. **Application Rejected** – Sent when admin denies application
3. **New Application Admin Alert** – Sent when user signs up (creates Application)
4. **Program Enrollment Confirmation** – Sent when member enrolls in a program
5. **Course Completion Congratulations** – Sent when member completes a course
6. **Weekly Recap Email** – Cron Sundays 6 PM to enrolled members
7. **Inactive Member Nudge** – Cron daily to members inactive 7+ days

See `NOTIFICATION-AUDIT.md` for full details. Cron endpoints require `CRON_SECRET` and `Authorization: Bearer <CRON_SECRET>`.

## Migrations & schema integrity (Sprint P3 — 2026-Q3)

Two guardrails sit in front of every Prisma migration. Both come from
PLAN-2026-Q3 §0 / AUDIT-2026-05-16 §C-D3, which identified the
`fix_schema_drift_*` rescue migrations as the symptom of a broken safety net.

### `scripts/safe-migrate.cjs`

Used by `npm run build:with-migrate` (the Vercel build path).

- **Default:** runs `prisma migrate deploy`. On success it follows with
  `prisma generate` and exits 0. On any failure it prints the full Prisma
  error to stderr and exits non-zero. **No auto-resolve, no silent retries.**
- **Manual override** for cases where you have inspected the DB by hand and
  are certain the failed migration is effectively applied:

  ```sh
  node scripts/safe-migrate.cjs --force-resolve <migration-name>
  ```

  Prints a loud warning, then runs `prisma migrate resolve --applied
  <migration-name>` exactly once. The migration name must match
  `/^[A-Za-z0-9_-]+$/`; shell metacharacters and empty names are rejected.

  **When to use it:** only after you have (a) read the failed migration's
  `migration.sql`, (b) confirmed via `psql` or Supabase Studio that the
  intended schema state is already in place, and (c) decided the right move
  is to mark this migration applied rather than write a corrective
  follow-up migration. If you are unsure, write a corrective migration
  instead.

  **When NOT to use it:** to make CI green. Failures are loud on purpose.

### `scripts/check-duplicate-migrations.mjs`

Standalone check — fails if any two directories under `prisma/migrations/`
share the same 14-digit timestamp prefix. Prisma orders migrations
alphabetically and will silently reorder collisions across machines, which
is exactly how the existing schema drift was introduced.

```sh
node scripts/check-duplicate-migrations.mjs
```

Husky is not installed in this repo (Sprint P3 chose not to add it as a new
dependency). Until it is, this script must be wired into CI (e.g. a
`pre-build` step or its own GitHub Actions job) and run before every
deploy. There are currently several real duplicate-timestamp collisions in
`prisma/migrations/` flagged by this script; those need to be re-timestamped
as a follow-up before the check can gate merges.

**Current status (2026-05-25):** PR #1366 was merged on 2026-05-21, but the
duplicate-timestamp re-timing slice it described is still intentionally
parked. Prisma keys applied migrations by directory name in
`_prisma_migrations`; renaming already-applied directories would make Prisma
replay SQL and risk breaking prod/staging deploys. Any future rename still
needs a coordinated `UPDATE _prisma_migrations SET migration_name = ...`
runbook per environment before deploy. Until that runbook exists and the
collisions are resolved safely, `npm run check-migrations` remains
informational rather than merge-blocking.
