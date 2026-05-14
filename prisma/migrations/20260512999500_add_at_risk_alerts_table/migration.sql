-- The `AtRiskAlert` Prisma model (schema.prisma) had no corresponding CREATE
-- TABLE migration anywhere in prisma/migrations/. Three later migrations
-- referenced the table:
--   - 20260513010000_add_at_risk_alert_notification_fields (ALTER TABLE)
--   - 20260513040000_add_rls_policies                       (ENABLE RLS + policies)
--   - 20260514000000_defer_rls_force_authorize_system       (NO FORCE)
-- All three would explode with "relation does not exist" on a fresh DB.
-- Discovered live on 2026-05-14 when prod was caught 22 migrations behind
-- master and a manual create-table had to be issued by hand to unblock
-- migration 20260513010000.
--
-- Timestamp 20260512999500 deliberately precedes 20260513010000 so this
-- runs FIRST on a fresh `prisma migrate deploy`. Idempotent — CREATE …
-- IF NOT EXISTS so existing environments where the table was already
-- created out-of-band (incl. prod after 2026-05-14) are a no-op.

CREATE TABLE IF NOT EXISTS "at_risk_alerts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "score" INTEGER NOT NULL,
    "factors" JSONB NOT NULL,
    "status" TEXT NOT NULL,
    "counselor_id" TEXT,
    "acknowledged_at" TIMESTAMP(3),
    "resolved_at" TIMESTAMP(3),
    "notified_counselor_at" TIMESTAMPTZ,
    "escalated_at" TIMESTAMPTZ,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "at_risk_alerts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "at_risk_alerts_user_id_created_at_idx"
  ON "at_risk_alerts" ("user_id", "created_at");
CREATE INDEX IF NOT EXISTS "at_risk_alerts_status_score_idx"
  ON "at_risk_alerts" ("status", "score");
CREATE INDEX IF NOT EXISTS "at_risk_alerts_counselor_id_idx"
  ON "at_risk_alerts" ("counselor_id");

-- ─── Rollback (manual) ──────────────────────────────────────────────────────
-- DROP TABLE IF EXISTS "at_risk_alerts";
