-- Add sms_opt_in to profiles for SMS contact preference
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "sms_opt_in" BOOLEAN NOT NULL DEFAULT false;
