-- Additive only. Run through the normal release migration path; no enrollment,
-- provider progress, credential, or existing member records are changed.
BEGIN;
SELECT pg_advisory_xact_lock(609090230);

CREATE TABLE IF NOT EXISTS "training_study_plans" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "program_slug" TEXT NOT NULL,
  "curriculum_version" TEXT NOT NULL,
  "weekly_hours" INTEGER NOT NULL CHECK ("weekly_hours" BETWEEN 1 AND 40),
  "plan_start_date" DATE NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "training_study_plans_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "training_study_plans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "training_study_plans_user_program_version_key"
  ON "training_study_plans"("user_id", "program_slug", "curriculum_version");
CREATE INDEX IF NOT EXISTS "training_study_plans_user_id_idx" ON "training_study_plans"("user_id");

CREATE TABLE IF NOT EXISTS "training_course_work" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "program_slug" TEXT NOT NULL,
  "curriculum_version" TEXT NOT NULL,
  "course_slug" TEXT NOT NULL,
  "notes" TEXT NOT NULL DEFAULT '' CHECK (char_length("notes") <= 10000),
  "artifact_url" VARCHAR(2000),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "training_course_work_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "training_course_work_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "training_course_work_user_program_version_course_key"
  ON "training_course_work"("user_id", "program_slug", "curriculum_version", "course_slug");
CREATE INDEX IF NOT EXISTS "training_course_work_user_id_idx" ON "training_course_work"("user_id");

-- Match the existing server-owned table posture: deny public PostgREST access,
-- permit a GUC-scoped member's own rows, and retain Prisma-owner access. No
-- counselor/partner-wide access is implied for private working notes.
ALTER TABLE "training_study_plans" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "training_course_work" ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'training_study_plans' AND policyname = 'training_study_plans_own') THEN
    CREATE POLICY "training_study_plans_own" ON "training_study_plans"
      FOR ALL USING ("user_id" = NULLIF(current_setting('app.current_user_id', true), ''))
      WITH CHECK ("user_id" = NULLIF(current_setting('app.current_user_id', true), ''));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'training_course_work' AND policyname = 'training_course_work_own') THEN
    CREATE POLICY "training_course_work_own" ON "training_course_work"
      FOR ALL USING ("user_id" = NULLIF(current_setting('app.current_user_id', true), ''))
      WITH CHECK ("user_id" = NULLIF(current_setting('app.current_user_id', true), ''));
  END IF;
END;
$$;
COMMIT;
