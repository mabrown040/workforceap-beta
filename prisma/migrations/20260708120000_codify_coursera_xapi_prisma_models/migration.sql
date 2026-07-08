-- Codify the Coursera xAPI ingest tables that were previously created only at
-- runtime by `lib/xapi/mappings.ts` (`ensureCourseraMappingTables`). Prisma
-- models `CourseraXapiEvent` and `CourseraUnmatchedActorAlert` now own these
-- tables; this migration is idempotent (IF NOT EXISTS) so prod DBs that already
-- have the runtime-created tables are unaffected.
--
-- `coursera_identity_mappings` was already codified in
-- 20260510000000_add_coursera_identity_mapping_model; organization_id backfill
-- and NOT NULL are in 20260519050000 and 20260615040400.

-- ── coursera_xapi_events ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "coursera_xapi_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "statement_id" TEXT,
    "actor_email" TEXT,
    "actor_identifier" TEXT,
    "actor_home_page" TEXT,
    "course_slug" TEXT,
    "course_name" TEXT,
    "verb_id" TEXT,
    "matched_user_id" TEXT,
    "organization_id" TEXT,
    "mapping_method" TEXT,
    "completion_status" TEXT NOT NULL DEFAULT 'received',
    "error" TEXT,
    "raw_payload" JSONB NOT NULL,
    "received_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "coursera_xapi_events_pkey" PRIMARY KEY ("id")
);

-- Idempotent column add for tables created before organization_id existed.
ALTER TABLE IF EXISTS "coursera_xapi_events"
  ADD COLUMN IF NOT EXISTS "organization_id" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "coursera_xapi_events_statement_id_key"
  ON "coursera_xapi_events" ("statement_id")
  WHERE "statement_id" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "coursera_xapi_events_actor_email_idx"
  ON "coursera_xapi_events" (LOWER("actor_email"));

CREATE INDEX IF NOT EXISTS "coursera_xapi_events_status_idx"
  ON "coursera_xapi_events" ("completion_status", "received_at" DESC);

CREATE INDEX IF NOT EXISTS "coursera_xapi_events_org_id_idx"
  ON "coursera_xapi_events" ("organization_id", "received_at" DESC);

DO $$ BEGIN
    ALTER TABLE "coursera_xapi_events"
        ADD CONSTRAINT "coursera_xapi_events_matched_user_id_fkey"
        FOREIGN KEY ("matched_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── coursera_unmatched_actor_alerts ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "coursera_unmatched_actor_alerts" (
    "actor_email_lower" TEXT NOT NULL,
    "organization_id" TEXT,
    "first_seen_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "first_statement_id" TEXT,
    "last_event_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "email_notified_at" TIMESTAMPTZ,

    CONSTRAINT "coursera_unmatched_actor_alerts_pkey" PRIMARY KEY ("actor_email_lower")
);

ALTER TABLE IF EXISTS "coursera_unmatched_actor_alerts"
  ADD COLUMN IF NOT EXISTS "organization_id" TEXT;

CREATE INDEX IF NOT EXISTS "coursera_unmatched_actor_alerts_seen_idx"
  ON "coursera_unmatched_actor_alerts" ("first_seen_at" DESC);

-- ── coursera_identity_mappings org indexes (from 20260519050000) ─────────────
CREATE INDEX IF NOT EXISTS "coursera_identity_mappings_org_id_idx"
  ON "coursera_identity_mappings" ("organization_id");

CREATE INDEX IF NOT EXISTS "coursera_identity_mappings_org_actor_idx"
  ON "coursera_identity_mappings" ("organization_id", "actor_identifier", COALESCE("actor_home_page", ''))
  WHERE "actor_identifier" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "coursera_identity_mappings_org_email_idx"
  ON "coursera_identity_mappings" ("organization_id", LOWER("coursera_email"))
  WHERE "coursera_email" IS NOT NULL;
