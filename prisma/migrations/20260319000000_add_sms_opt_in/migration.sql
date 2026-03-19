-- Add SMS opt-in preference to profiles
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "sms_opt_in" BOOLEAN NOT NULL DEFAULT false;
