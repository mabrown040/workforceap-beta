-- Add missing notify columns to partners table that were skipped in initial migration
ALTER TABLE "partners" ADD COLUMN IF NOT EXISTS "notify_on_enrollment" BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE "partners" ADD COLUMN IF NOT EXISTS "notify_on_course" BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE "partners" ADD COLUMN IF NOT EXISTS "notify_on_certified" BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE "partners" ADD COLUMN IF NOT EXISTS "notify_on_placed" BOOLEAN NOT NULL DEFAULT TRUE;
