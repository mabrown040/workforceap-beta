-- Coursera completion engine: per-member Coursera course enrollment rows.
-- Fed by POST /api/integrations/coursera/webhook (HMAC-verified progress).

CREATE TABLE IF NOT EXISTS "coursera_enrollments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "course_id" TEXT NOT NULL,
    "enrolled_at" TIMESTAMPTZ NOT NULL,
    "last_progress_pct" INTEGER NOT NULL DEFAULT 0,
    "completed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "coursera_enrollments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "coursera_enrollments_last_progress_pct_check" CHECK (
      "last_progress_pct" >= 0 AND "last_progress_pct" <= 100
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS "coursera_enrollments_user_id_course_id_key"
  ON "coursera_enrollments" ("user_id", "course_id");

CREATE INDEX IF NOT EXISTS "coursera_enrollments_user_id_idx"
  ON "coursera_enrollments" ("user_id");

CREATE INDEX IF NOT EXISTS "coursera_enrollments_course_id_idx"
  ON "coursera_enrollments" ("course_id");

CREATE INDEX IF NOT EXISTS "coursera_enrollments_completed_at_idx"
  ON "coursera_enrollments" ("completed_at");

-- ─── Rollback (manual) ───────────────────────────────────────────────────────
-- DROP TABLE IF EXISTS "coursera_enrollments";
