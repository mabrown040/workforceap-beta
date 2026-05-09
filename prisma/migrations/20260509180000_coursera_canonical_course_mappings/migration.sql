-- Admin-curated mapping from a real Coursera course (identified by its
-- coursera_course_id) to a canonical (programSlug, courseSlug) pair in
-- lib/content/programs.ts. Lets non-engineers wire up new courses without a
-- code change — see /admin/training-progress (raw view) for the inline
-- "Map this" action that writes here.
--
-- Resolution order at read time is: this table first (most-recently-edited
-- row per coursera_course_id wins), then the static courseraCourseId field
-- on the program-def fallback. An admin can override a static mapping
-- without redeploying.
--
-- Idempotent: IF NOT EXISTS for crash-safe re-deploys (matches the
-- #1080 / #1083 pattern used by other Coursera-related migrations).

CREATE TABLE IF NOT EXISTS "coursera_canonical_course_mappings" (
    "id" TEXT NOT NULL,
    "coursera_course_id" TEXT NOT NULL,
    "coursera_course_slug" TEXT,
    "canonical_program_slug" TEXT NOT NULL,
    "canonical_course_slug" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,

    CONSTRAINT "coursera_canonical_course_mappings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "coursera_canonical_course_mappings_coursera_course_id_key"
  ON "coursera_canonical_course_mappings" ("coursera_course_id");

CREATE INDEX IF NOT EXISTS "coursera_canonical_course_mappings_canonical_program_slug_idx"
  ON "coursera_canonical_course_mappings" ("canonical_program_slug");

CREATE INDEX IF NOT EXISTS "coursera_canonical_course_mappings_canonical_course_slug_idx"
  ON "coursera_canonical_course_mappings" ("canonical_course_slug");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'coursera_canonical_course_mappings_created_by_id_fkey'
  ) THEN
    ALTER TABLE "coursera_canonical_course_mappings"
      ADD CONSTRAINT "coursera_canonical_course_mappings_created_by_id_fkey"
      FOREIGN KEY ("created_by_id") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- ─── Rollback (manual) ───────────────────────────────────────────────────────
-- DROP TABLE IF EXISTS "coursera_canonical_course_mappings";
