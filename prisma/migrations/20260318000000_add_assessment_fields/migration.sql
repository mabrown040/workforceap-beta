-- Add assessment gate fields to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "assessment_completed" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "assessment_completed_at" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "assessment_score" INTEGER;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "assessment_score_pct" INTEGER;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "program_interest" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "assessment_answers" JSONB;
