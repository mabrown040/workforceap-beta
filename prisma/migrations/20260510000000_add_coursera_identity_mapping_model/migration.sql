-- Models the `coursera_identity_mappings` table in Prisma. The table was
-- previously created on demand at runtime by `lib/xapi/mappings.ts` via raw
-- SQL — this migration codifies that schema so fresh DBs get the table from
-- `prisma migrate deploy` instead of relying on the lazy creation path.
--
-- IMPORTANT: this migration is intentionally idempotent and non-destructive.
-- The table already exists in prod with real rows, populated by the on-demand
-- creator. The CREATE statements use IF NOT EXISTS so deploying against an
-- existing DB is a no-op, and we deliberately do NOT alter any existing
-- columns or indexes (the `user_id` column is plain TEXT in prod — switching
-- it to UUID or a foreign-key relation here would require a data migration
-- because not every existing user_id value is guaranteed to be a valid UUID).
--
-- Matches the on-demand DDL in `lib/xapi/mappings.ts` byte-for-byte where
-- possible so both code paths converge on the same schema.

CREATE TABLE IF NOT EXISTS "coursera_identity_mappings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "coursera_email" TEXT,
    "actor_identifier" TEXT,
    "actor_home_page" TEXT,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "notes" TEXT,
    "created_by_user_id" TEXT,
    "last_seen_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "coursera_identity_mappings_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "coursera_identity_mappings_identity_check" CHECK (
      "coursera_email" IS NOT NULL OR "actor_identifier" IS NOT NULL
    )
);

-- Partial unique index on lower(email) — matches the on-demand creator.
CREATE UNIQUE INDEX IF NOT EXISTS "coursera_identity_mappings_email_key"
  ON "coursera_identity_mappings" (LOWER("coursera_email"))
  WHERE "coursera_email" IS NOT NULL;

-- Partial unique index on (actor_identifier, actor_home_page) — matches the
-- on-demand creator. Coalesces NULL home_page to '' so two rows with the same
-- actor_identifier but missing home_page collide as expected.
CREATE UNIQUE INDEX IF NOT EXISTS "coursera_identity_mappings_actor_key"
  ON "coursera_identity_mappings" ("actor_identifier", COALESCE("actor_home_page", ''))
  WHERE "actor_identifier" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "coursera_identity_mappings_user_id_idx"
  ON "coursera_identity_mappings" ("user_id");

-- Composite index on (actor_identifier, actor_home_page) matches the Prisma
-- `@@index([actorIdentifier, actorHomePage])` declaration so `prisma migrate
-- deploy` against an empty DB doesn't see drift. Distinct from the partial
-- unique index above (which has a WHERE clause and a COALESCE).
CREATE INDEX IF NOT EXISTS "coursera_identity_mappings_actor_identifier_actor_home_page_idx"
  ON "coursera_identity_mappings" ("actor_identifier", "actor_home_page");

-- ─── Rollback (manual) ───────────────────────────────────────────────────────
-- DROP TABLE IF EXISTS "coursera_identity_mappings";
