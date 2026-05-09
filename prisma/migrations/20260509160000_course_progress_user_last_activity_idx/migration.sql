-- Composite "(user_id, last_activity_at DESC)" index for fast
-- "show this learner's most recent activity" queries. The dashboard hero
-- card and the counselor "who has gone stale" view both want
-- `WHERE user_id = $1 ORDER BY last_activity_at DESC LIMIT N`; without this
-- index Postgres has to filter by user_id then sort the resulting rows.
--
-- The earlier migration (`20260509153000_course_progress_last_activity_at`)
-- created a single-column index on `last_activity_at` only, which is good
-- for cross-user "anything updated lately?" queries but does NOT serve the
-- per-user ordered scan. We keep both indexes; they have different shapes.
--
-- Idempotent: IF NOT EXISTS for crash-safe re-deploys (matches the
-- #1080 / #1083 pattern).

CREATE INDEX IF NOT EXISTS "course_progress_user_id_last_activity_at_idx"
  ON "course_progress" ("user_id", "last_activity_at" DESC);

-- ─── Rollback (manual) ───────────────────────────────────────────────────────
-- DROP INDEX IF EXISTS "course_progress_user_id_last_activity_at_idx";
