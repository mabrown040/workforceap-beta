-- Counselor Sprint: add education_level to profiles (other columns exist from readiness migration)
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "education_level" TEXT;
