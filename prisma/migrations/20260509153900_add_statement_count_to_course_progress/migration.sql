-- Add `course_progress.statement_count` to track how many xAPI statements
-- have contributed to each CourseProgress row. This gives admins a rough
-- measure of engagement volume per course (high statement count = active
-- learner) and helps distinguish stale rows with old `last_activity_at` from
-- truly active ones.
--
-- Idempotent: IF NOT EXISTS for crash-safe re-deploys.

ALTER TABLE "course_progress"
  ADD COLUMN IF NOT EXISTS "statement_count" INTEGER NOT NULL DEFAULT 0;

-- Composite index for "per-member per-program" aggregate queries.
-- The admin training-progress dashboard and the "active this week" widget
-- both filter on `user_id + program_slug` then aggregate across courses.
CREATE INDEX IF NOT EXISTS "course_progress_user_id_program_slug_idx"
  ON "course_progress" ("user_id", "program_slug");

-- ─── Rollback (manual) ───────────────────────────────────────────────────────
-- DROP INDEX IF EXISTS "course_progress_user_id_program_slug_idx";
-- ALTER TABLE "course_progress" DROP COLUMN IF EXISTS "statement_count";
