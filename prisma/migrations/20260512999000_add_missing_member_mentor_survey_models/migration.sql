-- Three Prisma models declared in schema.prisma but never given a
-- corresponding CREATE TABLE migration. `prisma generate` produces a
-- client that exposes each delegate, but `prisma migrate deploy` against
-- a fresh DB blows up: the later 20260513040000_add_rls_policies migration
-- references `placement_surveys` and `member_next_best_actions` in ENABLE
-- ROW LEVEL SECURITY statements, and `20260513000000_add_placement_survey_wave`
-- runs ALTER TABLE on a placement_surveys it assumes exists. Both fail with
-- "relation does not exist".
--
-- Models / tables created here:
--   1. PlacementSurvey       → placement_surveys
--   2. MemberNextBestAction  → member_next_best_actions
--   3. MentorSpecialty       → mentor_specialties
--
-- Timestamp deliberately pre-dates 20260513000000 so this runs FIRST.
--
-- IMPORTANT: `placement_surveys` is created WITHOUT the `wave` column here.
-- The existing migration `20260513000000_add_placement_survey_wave` adds
-- the `wave` column + its enum + the composite unique on (user_id, wave).
-- Including `wave` here would collide with that migration's ADD COLUMN.
-- The single-column UNIQUE on user_id below is intentional —
-- `add_placement_survey_wave` drops it and recreates it as composite,
-- matching the historical migration chain.
--
-- Idempotent (IF NOT EXISTS) so applying against an environment where the
-- tables happen to exist (e.g. seeded via raw SQL in a long-lived env) is
-- safe.

-- ─── 1) placement_surveys ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "placement_surveys" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "placement_id" TEXT NOT NULL REFERENCES "placement_records"("id") ON DELETE CASCADE,
    "sent_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "completed_at" TIMESTAMPTZ,
    "escalated_at" TIMESTAMPTZ,
    "job_satisfaction" INTEGER,
    "training_relevance" INTEGER,
    "support_quality" INTEGER,
    "what_helped_most" TEXT,
    "what_could_improve" TEXT,
    "still_employed" BOOLEAN,
    "current_salary" INTEGER,
    "allow_testimonial" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "placement_surveys_pkey" PRIMARY KEY ("id")
);

-- UNIQUE on user_id matches the pre-wave-migration state. The next
-- migration (20260513000000_add_placement_survey_wave) drops this and
-- creates a composite (user_id, wave) unique.
CREATE UNIQUE INDEX IF NOT EXISTS "placement_surveys_user_id_key"
  ON "placement_surveys" ("user_id");

CREATE INDEX IF NOT EXISTS "placement_surveys_sent_at_idx"
  ON "placement_surveys" ("sent_at");
CREATE INDEX IF NOT EXISTS "placement_surveys_placement_id_idx"
  ON "placement_surveys" ("placement_id");

-- ─── 2) member_next_best_actions ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "member_next_best_actions" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "cta_label" TEXT NOT NULL,
    "cta_href" TEXT NOT NULL,
    "icon" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "member_next_best_actions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "member_next_best_actions_member_id_status_priority_idx"
  ON "member_next_best_actions" ("member_id", "status", "priority");

-- ─── 3) mentor_specialties ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "mentor_specialties" (
    "id" TEXT NOT NULL,
    "mentor_id" TEXT NOT NULL REFERENCES "mentors"("id") ON DELETE CASCADE,
    "name" TEXT NOT NULL,

    CONSTRAINT "mentor_specialties_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "mentor_specialties_mentor_id_idx"
  ON "mentor_specialties" ("mentor_id");

-- ─── Rollback (manual) ──────────────────────────────────────────────────────
-- DROP TABLE IF EXISTS "mentor_specialties";
-- DROP TABLE IF EXISTS "member_next_best_actions";
-- DROP TABLE IF EXISTS "placement_surveys";
