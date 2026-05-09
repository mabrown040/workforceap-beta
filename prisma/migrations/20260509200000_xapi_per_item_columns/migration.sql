-- Per-item Coursera progress: surface lecture/reading/quiz/lab-level signals
-- that xAPI is already emitting. The data is in `xapi_statements.payload`
-- (object.id ends in `/item/<itemId>`, context.extensions.itemType carries
-- the discriminator) — we just weren't projecting it into queryable columns.
--
-- Additive + nullable so the existing write/read paths keep working. The
-- backfill parses payload JSONB so historical statements get retro-populated
-- and the new admin drill-down has data immediately. Course-level events
-- (object.id ends in `/course/<id>`, no `/item/` segment) leave both columns
-- NULL — that's how we distinguish course vs item rows in SQL.
--
-- Idempotent: IF NOT EXISTS on column + index adds, matching the
-- 20260506230000_add_xapi_actor_account_and_payload pattern.

ALTER TABLE "xapi_statements"
  ADD COLUMN IF NOT EXISTS "course_item_id" TEXT,
  ADD COLUMN IF NOT EXISTS "item_type" TEXT;

-- Backfill: extract `course_item_id` from payload.object.id when the URL
-- contains `/item/<id>`, and pull `item_type` from the Coursera xAPI extension.
-- Guarded with `WHERE course_item_id IS NULL AND item_type IS NULL` so the
-- statement is a no-op on re-runs (idempotent).
UPDATE "xapi_statements"
SET
  "course_item_id" = substring(
    payload->'object'->>'id'
    FROM '/item/([^/?]+)'
  ),
  "item_type" = payload->'context'->'extensions'->>'http://coursera.org/xapi/extensions/itemType'
WHERE
  "payload" IS NOT NULL
  AND "course_item_id" IS NULL
  AND "item_type" IS NULL;

-- Query patterns the new admin drill-down hits:
--   1. (courseId, courseItemId) — group per-item rollups for a course
--   2. (actorEmail, courseId)   — fetch a learner's items for a single course
CREATE INDEX IF NOT EXISTS "xapi_statements_course_item_idx"
  ON "xapi_statements" ("course_id", "course_item_id")
  WHERE "course_item_id" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "xapi_statements_actor_course_idx"
  ON "xapi_statements" ("actor_email", "course_id")
  WHERE "actor_email" IS NOT NULL AND "course_id" IS NOT NULL;

-- ─── Rollback (manual) ───────────────────────────────────────────────────────
-- DROP INDEX IF EXISTS "xapi_statements_actor_course_idx";
-- DROP INDEX IF EXISTS "xapi_statements_course_item_idx";
-- ALTER TABLE "xapi_statements"
--   DROP COLUMN IF EXISTS "item_type",
--   DROP COLUMN IF EXISTS "course_item_id";
