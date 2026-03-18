-- Add onboarding and WIOA fields to profiles
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "household_income" TEXT;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "referral_source" TEXT;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "us_citizen" BOOLEAN;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "authorized_to_work" BOOLEAN;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "has_disability" BOOLEAN;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "ethnicity" TEXT;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "counselor_notes" TEXT;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "resume_original_path" TEXT;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "resume_enhanced_path" TEXT;

-- Create readiness_checklist table
CREATE TABLE IF NOT EXISTS "readiness_checklist" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "section" INTEGER NOT NULL,
    "item_key" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completed_at" TIMESTAMP(3),
    "completed_by" TEXT,
    "notes" TEXT,
    "value_text" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "readiness_checklist_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "readiness_checklist_user_id_item_key_key" ON "readiness_checklist"("user_id", "item_key");
CREATE INDEX IF NOT EXISTS "readiness_checklist_user_id_idx" ON "readiness_checklist"("user_id");

ALTER TABLE "readiness_checklist" ADD CONSTRAINT "readiness_checklist_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
