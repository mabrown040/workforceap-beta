-- Create FundingSource enum
CREATE TYPE "FundingSource" AS ENUM ('GRANT', 'EMPLOYER', 'PARTNER_ORG', 'SELF', 'OTHER');

-- Add fields to course_enrollments
ALTER TABLE "course_enrollments"
  ADD COLUMN IF NOT EXISTS "funding_source" "FundingSource",
  ADD COLUMN IF NOT EXISTS "funding_notes" TEXT,
  ADD COLUMN IF NOT EXISTS "workspace_email_provisioned" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "workspace_email" TEXT;

-- Add fields to users
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "workspace_email" TEXT,
  ADD COLUMN IF NOT EXISTS "workspace_email_provisioned" BOOLEAN NOT NULL DEFAULT false;;
