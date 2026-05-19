-- Create CounselorAffiliation enum
CREATE TYPE "counselor_affiliations" AS ENUM ('wap_staff', 'partner', 'independent');

-- Add affiliation column with temporary nullable default
ALTER TABLE "counselors" ADD COLUMN "affiliation" "counselor_affiliations" NULL;

-- Backfill existing rows based on partner_id presence
UPDATE "counselors" SET "affiliation" = 'partner' WHERE "partner_id" IS NOT NULL;
UPDATE "counselors" SET "affiliation" = 'wap_staff' WHERE "partner_id" IS NULL;

-- Make affiliation non-nullable with default
ALTER TABLE "counselors" ALTER COLUMN "affiliation" SET NOT NULL;
ALTER TABLE "counselors" ALTER COLUMN "affiliation" SET DEFAULT 'wap_staff';

-- Add index for affiliation queries
CREATE INDEX "counselors_affiliation_idx" ON "counselors"("affiliation");

-- Verify: no nulls remain
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "counselors" WHERE "affiliation" IS NULL) THEN
    RAISE EXCEPTION 'Migration failed: some counselors still have null affiliation';
  END IF;
END $$;
