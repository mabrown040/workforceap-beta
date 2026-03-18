-- Admin role on profiles, program_changed_at for admin actions
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "role" TEXT DEFAULT 'member';
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "program_changed_at" TIMESTAMP(3);
