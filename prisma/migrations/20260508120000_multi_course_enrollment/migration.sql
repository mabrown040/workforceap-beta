-- Multi-program enrollment: drop the user-level unique on
-- course_enrollments.user_id, allow multiple rows per user (one per program),
-- and add `is_primary` plus a partial unique index so AT MOST ONE row per user
-- can be the primary enrollment. Existing rows are flipped to is_primary=true
-- so the current "user has one program" world keeps working unchanged.
--
-- Idempotent (uses IF EXISTS / IF NOT EXISTS) so re-running is safe.
-- Reversible via prisma/migrations/<this>/down.sql (kept inline as comments
-- below for the rollback playbook).

-- 1) Add the new column. Default false; we backfill existing rows below.
ALTER TABLE "course_enrollments"
  ADD COLUMN IF NOT EXISTS "is_primary" BOOLEAN NOT NULL DEFAULT false;

-- 2) Backfill: every existing row is the user's only enrollment today, so
-- treat it as the primary one. Idempotent: only flips rows that are still
-- false. Without this the partial unique index below has nothing to enforce
-- but the dashboard would default to "no primary enrollment".
UPDATE "course_enrollments"
SET "is_primary" = true
WHERE "is_primary" = false;

-- 3) Drop the row-level unique on user_id. The constraint name Prisma
-- generated historically is "course_enrollments_user_id_key"; the index it
-- backs has the same name. Use IF EXISTS so a re-run on a partially
-- migrated DB succeeds.
ALTER TABLE "course_enrollments"
  DROP CONSTRAINT IF EXISTS "course_enrollments_user_id_key";
DROP INDEX IF EXISTS "course_enrollments_user_id_key";

-- 4) Composite unique on (user_id, program_slug): a user has at most one row
-- per program. This is what `findUnique({ where: { userId_programSlug } })`
-- now keys on.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'course_enrollments_user_id_program_slug_key'
  ) THEN
    ALTER TABLE "course_enrollments"
      ADD CONSTRAINT "course_enrollments_user_id_program_slug_key"
      UNIQUE ("user_id", "program_slug");
  END IF;
END $$;

-- 5) Partial unique index: AT MOST ONE primary enrollment per user.
-- Postgres-only feature; equivalent to "WHERE is_primary = true" in the
-- index predicate. A user with zero rows is fine; a user with one primary +
-- N non-primary rows is fine; two primaries fail with a unique violation.
CREATE UNIQUE INDEX IF NOT EXISTS "course_enrollments_user_primary_uidx"
  ON "course_enrollments" ("user_id")
  WHERE "is_primary" = true;

-- 6) Helper index for `findFirst({ where: { userId, isPrimary }, ... })`
-- and the dashboard's "primary first, then by enrolledAt" ordering. Not a
-- unique index; the partial unique above handles the constraint.
CREATE INDEX IF NOT EXISTS "course_enrollments_user_id_is_primary_idx"
  ON "course_enrollments" ("user_id", "is_primary");

-- ─── Rollback (manual) ───────────────────────────────────────────────────────
-- DROP INDEX IF EXISTS "course_enrollments_user_id_is_primary_idx";
-- DROP INDEX IF EXISTS "course_enrollments_user_primary_uidx";
-- ALTER TABLE "course_enrollments"
--   DROP CONSTRAINT IF EXISTS "course_enrollments_user_id_program_slug_key";
-- -- Before re-adding the user_id unique, dedupe to one row per user:
-- -- DELETE FROM "course_enrollments" a USING "course_enrollments" b
-- --   WHERE a.user_id = b.user_id AND a.is_primary = false AND b.is_primary = true;
-- ALTER TABLE "course_enrollments"
--   ADD CONSTRAINT "course_enrollments_user_id_key" UNIQUE ("user_id");
-- ALTER TABLE "course_enrollments" DROP COLUMN IF EXISTS "is_primary";
