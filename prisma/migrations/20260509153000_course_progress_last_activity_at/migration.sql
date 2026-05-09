-- Add `course_progress.last_activity_at` so B4B sync can record Coursera's
-- `lastActivityAt` timestamp independently of `overallProgress`. A learner
-- who completes a single quiz (1-5% of a course) shows `overallProgress=0`
-- in enrollmentReports but has a real `lastActivityAt`. Without this column
-- the sync falls through to `NOT_STARTED` and appears idle.
--
-- Idempotent: IF NOT EXISTS for crash-safe re-deploys.

ALTER TABLE "course_progress"
  ADD COLUMN IF NOT EXISTS "last_activity_at" TIMESTAMP(3);

-- Index for "members with activity in the last N days" counselor queries.
CREATE INDEX IF NOT EXISTS "course_progress_last_activity_at_idx"
  ON "course_progress" ("last_activity_at");

-- ─── Rollback (manual) ───────────────────────────────────────────────────────
-- DROP INDEX IF EXISTS "course_progress_last_activity_at_idx";
-- ALTER TABLE "course_progress" DROP COLUMN IF EXISTS "last_activity_at";
