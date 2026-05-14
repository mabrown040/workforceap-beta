-- Quick-win composite indexes from the 2026-05-13 database performance audit.
-- These address the most common unbounded dashboard queries and high-traffic
-- cron jobs without changing application code.
--
-- Idempotent: IF NOT EXISTS for crash-safe re-deploys.

-- 1. xAPI replay cron: unprocessed statements ordered by ingestion time
CREATE INDEX IF NOT EXISTS "xapi_statements_processed_created_at_idx"
  ON "xapi_statements" ("processed", "created_at");

-- 2. Dashboard queries: per-member goals ordered by creation time
CREATE INDEX IF NOT EXISTS "goals_user_id_created_at_idx"
  ON "goals" ("user_id", "created_at");

-- 3. Dashboard queries: per-member job applications ordered by creation time
CREATE INDEX IF NOT EXISTS "job_applications_user_id_created_at_idx"
  ON "job_applications" ("user_id", "created_at");

-- 4. Dashboard queries: per-member job applications filtered by status
CREATE INDEX IF NOT EXISTS "job_applications_user_id_status_created_at_idx"
  ON "job_applications" ("user_id", "status", "created_at");

-- 5. Dashboard queries: per-member AI tool results ordered by creation time
CREATE INDEX IF NOT EXISTS "ai_tool_results_user_id_created_at_idx"
  ON "ai_tool_results" ("user_id", "created_at");

-- 6. Counselor inbox: active assignments ordered by assignment time (most recent first)
CREATE INDEX IF NOT EXISTS "counselor_assignments_member_id_active_assigned_at_idx"
  ON "counselor_assignments" ("member_id", "active", "assigned_at" DESC);

-- 7. Message/conversation queries: messages by author ordered by creation time (most recent first)
CREATE INDEX IF NOT EXISTS "messages_author_id_created_at_idx"
  ON "messages" ("author_id", "created_at" DESC);

-- 8. Training progress lookups: per-member course progress
CREATE INDEX IF NOT EXISTS "course_progress_user_id_course_id_completed_at_idx"
  ON "course_progress" ("user_id", "course_id", "completed_at");

-- ─── Rollback (manual) ───────────────────────────────────────────────────────
-- DROP INDEX IF EXISTS "xapi_statements_processed_created_at_idx";
-- DROP INDEX IF EXISTS "goals_user_id_created_at_idx";
-- DROP INDEX IF EXISTS "job_applications_user_id_created_at_idx";
-- DROP INDEX IF EXISTS "job_applications_user_id_status_created_at_idx";
-- DROP INDEX IF EXISTS "ai_tool_results_user_id_created_at_idx";
-- DROP INDEX IF EXISTS "counselor_assignments_member_id_active_assigned_at_idx";
-- DROP INDEX IF EXISTS "messages_author_id_created_at_idx";
-- DROP INDEX IF EXISTS "course_progress_user_id_course_id_completed_at_idx";
