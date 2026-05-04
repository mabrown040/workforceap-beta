-- Coursera "Learner activity & progress" CSV import — per-learner-per-course progress.
-- Idempotent on (lower(external_email), coursera_course_id). userId optional;
-- resolved at ingest time via direct email match or coursera_identity_mappings.
-- Hand-written to mirror the CREATE TABLE IF NOT EXISTS style used by
-- the runtime DDL for coursera_xapi_events / coursera_identity_mappings.

CREATE TABLE IF NOT EXISTS "coursera_course_progress" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "external_email" TEXT NOT NULL,
    "external_name" TEXT,
    "coursera_course_id" TEXT NOT NULL,
    "coursera_course_slug" TEXT,
    "course_name" TEXT NOT NULL,
    "university" TEXT,
    "collection_name" TEXT,
    "collection_id" TEXT,
    "program_slug" TEXT NOT NULL,
    "program_name" TEXT,
    "enrollment_time" TIMESTAMP(3),
    "class_start_time" TIMESTAMP(3),
    "class_end_time" TIMESTAMP(3),
    "last_activity_time" TIMESTAMP(3),
    "completion_time" TIMESTAMP(3),
    "overall_progress" DECIMAL(5,2) NOT NULL,
    "learning_hours" DECIMAL(8,2) NOT NULL,
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    "is_removed_from_program" BOOLEAN NOT NULL DEFAULT false,
    "course_grade" TEXT,
    "certificate_url" TEXT,
    "contract_name" TEXT,
    "contract_active" BOOLEAN,
    "source" TEXT NOT NULL DEFAULT 'csv_import',
    "last_synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coursera_course_progress_pkey" PRIMARY KEY ("id")
);

-- Case-insensitive idempotency key: (lower(external_email), coursera_course_id).
-- Mirrors the lower(coursera_email) index pattern used on coursera_identity_mappings.
CREATE UNIQUE INDEX IF NOT EXISTS "coursera_course_progress_email_course_key"
    ON "coursera_course_progress" (LOWER("external_email"), "coursera_course_id");

CREATE INDEX IF NOT EXISTS "coursera_course_progress_user_id_idx"
    ON "coursera_course_progress" ("user_id");

CREATE INDEX IF NOT EXISTS "coursera_course_progress_program_slug_idx"
    ON "coursera_course_progress" ("program_slug");

CREATE INDEX IF NOT EXISTS "coursera_course_progress_course_id_idx"
    ON "coursera_course_progress" ("coursera_course_id");

-- Foreign key — guarded so the migration is safe to re-apply against partial state.
DO $$ BEGIN
    ALTER TABLE "coursera_course_progress"
        ADD CONSTRAINT "coursera_course_progress_user_id_fkey"
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
