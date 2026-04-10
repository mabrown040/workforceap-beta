-- Add WIOA / grant-reporting fields to PlacementRecord.
-- PlacementRecord is the canonical placement source; these fields
-- support yearly WIOA reporting requirements.
-- All new columns are optional (nullable) so existing records are unaffected.

ALTER TABLE "placement_records" ADD COLUMN IF NOT EXISTS "program_slug" TEXT;
ALTER TABLE "placement_records" ADD COLUMN IF NOT EXISTS "wage_at_follow_up" INTEGER;
ALTER TABLE "placement_records" ADD COLUMN IF NOT EXISTS "retention_status" TEXT;
ALTER TABLE "placement_records" ADD COLUMN IF NOT EXISTS "start_date_verified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "placement_records" ADD COLUMN IF NOT EXISTS "funding_source" TEXT;
ALTER TABLE "placement_records" ADD COLUMN IF NOT EXISTS "grant_reporting_notes" TEXT;
