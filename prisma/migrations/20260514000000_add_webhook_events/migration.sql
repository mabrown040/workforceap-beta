-- Adds the `webhook_events` table that backs the Prisma `WebhookEvent`
-- model. The model was added to schema.prisma in this PR (#1190) for the
-- new admin webhook-events export route + retention page, but no
-- corresponding migration was committed — so on databases advanced via
-- `prisma migrate deploy`, the generated client would expose the model
-- while the table was absent, and `/api/admin/webhook-events/export`
-- would 500 with a missing-relation error.
--
-- This migration mirrors the Prisma model field-for-field. Idempotent:
-- safe to apply against a DB where the table already exists.

CREATE TABLE IF NOT EXISTS "webhook_events" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "event_type" TEXT,
    "event_id" TEXT,
    "payload_size" INTEGER NOT NULL,
    "processing_time_ms" INTEGER,
    "status" TEXT NOT NULL,
    "http_status_code" INTEGER,
    "error_message" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "next_retry_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

-- Indexes match the Prisma `@@index([...])` declarations on WebhookEvent.
CREATE INDEX IF NOT EXISTS "webhook_events_source_idx"
  ON "webhook_events" ("source");

CREATE INDEX IF NOT EXISTS "webhook_events_status_idx"
  ON "webhook_events" ("status");

CREATE INDEX IF NOT EXISTS "webhook_events_created_at_idx"
  ON "webhook_events" ("created_at");

CREATE INDEX IF NOT EXISTS "webhook_events_next_retry_at_idx"
  ON "webhook_events" ("next_retry_at");

CREATE INDEX IF NOT EXISTS "webhook_events_event_id_idx"
  ON "webhook_events" ("event_id");

-- ─── Rollback (manual) ───────────────────────────────────────────────────────
-- DROP TABLE IF EXISTS "webhook_events";
