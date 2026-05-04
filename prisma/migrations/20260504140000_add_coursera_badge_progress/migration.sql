-- Coursera "Learner activity & progress" CSV import — per-learner-per-badge progress.
-- Sourced from the LearningPathActivity tab. Each row in that CSV is per
-- (learner, course-within-badge); the ingester deduplicates to one row per
-- (learner, badgeSlug). Idempotent on (lower(external_email), badge_slug).
-- userId optional; resolved at ingest time via direct email match or
-- coursera_identity_mappings.
-- Hand-written to mirror the CREATE TABLE IF NOT EXISTS style used by the
-- coursera_course_progress migration and the runtime DDL for
-- coursera_xapi_events / coursera_identity_mappings.

CREATE TABLE IF NOT EXISTS "coursera_badge_progress" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "external_email" TEXT NOT NULL,
    "external_name" TEXT,
    "badge_slug" TEXT NOT NULL,
    "badge_title" TEXT NOT NULL,
    "badge_link" TEXT,
    "number_of_courses" INTEGER NOT NULL,
    "progress_percent" DECIMAL(5,2) NOT NULL,
    "courses_completed" INTEGER NOT NULL DEFAULT 0,
    "current_course_name" TEXT,
    "badge_completed" BOOLEAN NOT NULL DEFAULT false,
    "badge_completion_time" TIMESTAMP(3),
    "last_activity_time" TIMESTAMP(3),
    "total_learning_hours" DECIMAL(8,2) NOT NULL,
    "collection_id" TEXT,
    "collection_name" TEXT,
    "source" TEXT NOT NULL DEFAULT 'csv_import',
    "last_synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coursera_badge_progress_pkey" PRIMARY KEY ("id")
);

-- Case-insensitive idempotency key: (lower(external_email), badge_slug).
-- Matches the lower(external_email) pattern used on coursera_course_progress.
CREATE UNIQUE INDEX IF NOT EXISTS "coursera_badge_progress_email_badge_key"
    ON "coursera_badge_progress" (LOWER("external_email"), "badge_slug");

CREATE INDEX IF NOT EXISTS "coursera_badge_progress_user_id_idx"
    ON "coursera_badge_progress" ("user_id");

CREATE INDEX IF NOT EXISTS "coursera_badge_progress_badge_slug_idx"
    ON "coursera_badge_progress" ("badge_slug");

-- Foreign key — guarded so the migration is safe to re-apply against partial state.
DO $$ BEGIN
    ALTER TABLE "coursera_badge_progress"
        ADD CONSTRAINT "coursera_badge_progress_user_id_fkey"
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
