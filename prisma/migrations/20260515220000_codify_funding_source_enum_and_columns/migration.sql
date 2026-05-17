-- Codify the FundingSource enum + the four columns on course_enrollments
-- that schema.prisma already declares but were never added by any earlier
-- migration. Audit (2026-05-15, migration drift P0 #1) flagged that
-- `prisma migrate deploy` would fail on a fresh database the first time
-- Prisma generates a query referencing these columns.
--
-- All operations are guarded with IF NOT EXISTS / DO blocks so this is a
-- no-op on environments where the columns were created manually (prod
-- was patched by hand per the 2026-05-14 incident response).

-- 1. CREATE TYPE "FundingSource" if missing.
DO $$ BEGIN
  CREATE TYPE "FundingSource" AS ENUM ('GRANT', 'EMPLOYER', 'PARTNER_ORG', 'SELF', 'OTHER');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. Backfill the four declared columns on course_enrollments. Schema:
--    fundingSource             FundingSource? @map("funding_source")
--    fundingNotes              String?        @map("funding_notes") @db.Text
--    workspaceEmail            String?        @map("workspace_email")
--    workspaceEmailProvisioned Boolean        @default(false) @map("workspace_email_provisioned")
ALTER TABLE "course_enrollments"
  ADD COLUMN IF NOT EXISTS "funding_source" "FundingSource",
  ADD COLUMN IF NOT EXISTS "funding_notes" TEXT,
  ADD COLUMN IF NOT EXISTS "workspace_email" TEXT,
  ADD COLUMN IF NOT EXISTS "workspace_email_provisioned" BOOLEAN NOT NULL DEFAULT false;
