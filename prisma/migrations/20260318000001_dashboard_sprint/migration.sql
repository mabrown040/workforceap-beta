-- Dashboard sprint: enrolled program, courses, profile fields, notifications, soft delete

-- User: enrollment and training
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "enrolled_program" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "enrolled_at" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "courses_completed" JSONB DEFAULT '[]';
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "notifications_updates" BOOLEAN DEFAULT true;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "notifications_reminders" BOOLEAN DEFAULT true;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP(3);

-- Profile: extended fields
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "profile_phone" TEXT;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "profile_address" TEXT;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "profile_linkedin" TEXT;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "profile_bio" TEXT;
