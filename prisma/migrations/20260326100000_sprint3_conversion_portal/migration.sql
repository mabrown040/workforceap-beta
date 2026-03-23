-- Sprint 3: employer tier, partner referral codes, application attribution, AI match pipeline statuses

-- AlterTable
ALTER TABLE "employers" ADD COLUMN IF NOT EXISTS "tier" TEXT NOT NULL DEFAULT 'basic';

-- Partner referral_code (backfill from slug for existing rows)
ALTER TABLE "partners" ADD COLUMN IF NOT EXISTS "referral_code" TEXT;

UPDATE "partners" SET "referral_code" = "slug" WHERE "referral_code" IS NULL;

ALTER TABLE "partners" ALTER COLUMN "referral_code" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "partners_referral_code_key" ON "partners"("referral_code");

-- AlterTable applications
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "referral_source" TEXT;
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "referral_partner_id" TEXT;

-- AlterTable ai_job_matches
ALTER TABLE "ai_job_matches" ADD COLUMN IF NOT EXISTS "status_updated_at" TIMESTAMP(3);

-- Extend ai_job_match_status enum (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'ai_job_match_status' AND e.enumlabel = 'contacted'
  ) THEN
    ALTER TYPE "ai_job_match_status" ADD VALUE 'contacted';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'ai_job_match_status' AND e.enumlabel = 'interviewing'
  ) THEN
    ALTER TYPE "ai_job_match_status" ADD VALUE 'interviewing';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'ai_job_match_status' AND e.enumlabel = 'hired'
  ) THEN
    ALTER TYPE "ai_job_match_status" ADD VALUE 'hired';
  END IF;
END $$;

-- ForeignKey (applications -> partners)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'applications_referral_partner_id_fkey'
  ) THEN
    ALTER TABLE "applications" ADD CONSTRAINT "applications_referral_partner_id_fkey"
      FOREIGN KEY ("referral_partner_id") REFERENCES "partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "applications_referral_partner_id_idx" ON "applications"("referral_partner_id");
