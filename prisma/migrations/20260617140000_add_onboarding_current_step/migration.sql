-- Add onboarding_current_step to users table (schema has it, DB was missing it)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "onboarding_current_step" INTEGER NOT NULL DEFAULT 0;
