-- Course enrollment audit row (admin bypass) + optional program schedule for TWC export
-- Organization branding columns already exist on organizations; ensure nothing missing

CREATE TABLE IF NOT EXISTS "course_enrollments" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "program_slug" TEXT NOT NULL,
    "enrolled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "enrolled_by_admin_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "course_enrollments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "course_enrollments_user_id_key" ON "course_enrollments"("user_id");

CREATE INDEX IF NOT EXISTS "course_enrollments_organization_id_idx" ON "course_enrollments"("organization_id");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'course_enrollments_organization_id_fkey') THEN
    ALTER TABLE "course_enrollments" ADD CONSTRAINT "course_enrollments_organization_id_fkey"
      FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'course_enrollments_user_id_fkey') THEN
    ALTER TABLE "course_enrollments" ADD CONSTRAINT "course_enrollments_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'course_enrollments_enrolled_by_admin_id_fkey') THEN
    ALTER TABLE "course_enrollments" ADD CONSTRAINT "course_enrollments_enrolled_by_admin_id_fkey"
      FOREIGN KEY ("enrolled_by_admin_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Backfill from existing member enrollments (self-serve: no admin id)
INSERT INTO "course_enrollments" ("id", "organization_id", "user_id", "program_slug", "enrolled_at", "enrolled_by_admin_id", "created_at", "updated_at")
SELECT gen_random_uuid()::text, u."organization_id", u."id", u."enrolled_program", COALESCE(u."enrolled_at", u."created_at"), NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "users" u
WHERE u."enrolled_program" IS NOT NULL
  AND u."deleted_at" IS NULL
  AND NOT EXISTS (SELECT 1 FROM "course_enrollments" e WHERE e."user_id" = u."id");

ALTER TABLE "organization_program_catalog" ADD COLUMN IF NOT EXISTS "program_start_date" DATE;
ALTER TABLE "organization_program_catalog" ADD COLUMN IF NOT EXISTS "program_end_date" DATE;
