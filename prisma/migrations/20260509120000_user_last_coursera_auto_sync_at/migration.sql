ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "last_coursera_auto_sync_at" TIMESTAMP(3);

-- Helper index so a future "find users who haven't auto-synced in N days"
-- backfill / cron can scan cheaply. Not unique — many users will share
-- a NULL until their first dashboard hit.
CREATE INDEX IF NOT EXISTS "users_last_coursera_auto_sync_at_idx"
  ON "users" ("last_coursera_auto_sync_at");

-- ─── Rollback (manual) ───────────────────────────────────────────────────────
-- DROP INDEX IF EXISTS "users_last_coursera_auto_sync_at_idx";
-- ALTER TABLE "users" DROP COLUMN IF EXISTS "last_coursera_auto_sync_at";
