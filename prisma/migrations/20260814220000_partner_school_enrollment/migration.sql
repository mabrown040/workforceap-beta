-- Partner-school sponsored enrollment (Phase B1).
--
-- Purely additive: every column is nullable or carries a default, the new
-- table is new, and no existing row changes meaning. Nothing reads these
-- columns yet -- this migration only lands the shape so that onboarding a
-- school becomes data entry rather than a code change.
--
-- What lands here:
--   1. `partners` sponsorship columns -- who pays, for which term, how many
--      seats (`sponsorship_seat_cap` NULL = uncapped) -- plus the enrollment
--      page fields (`enrollment_page_enabled` gates the page, headline/blurb
--      carry its copy) and `school_district`.
--   2. `partner_program_catalog` -- the curated per-partner program list shown
--      on that page. `program_slug` has no FK: programs are defined in code
--      (lib/content/programs.ts), not in a table.
--   3. `course_enrollments.sponsored_by_partner_id` -- provenance stamped at
--      signup. Deliberately a plain column with no FK, matching how referral
--      provenance is already stored loosely, so the historical record of who
--      sponsored a seat outlives edits to the partner row.
--   4. `TokenLinkType.guardian_consent` -- for the under-18 consent link.
--
-- IF NOT EXISTS guards throughout keep this safe to re-apply against branch
-- databases that may already carry part of it from an earlier attempt.

-- 1. Enum value first, and deliberately outside any explicit transaction:
--    Postgres refuses ALTER TYPE ... ADD VALUE inside a transaction block on
--    older versions. Same bare, re-runnable form as
--    20260703010000_add_placement_survey_wave_180d and friends.
ALTER TYPE "TokenLinkType" ADD VALUE IF NOT EXISTS 'guardian_consent';

-- 2. Sponsorship + enrollment-page columns on partners.
ALTER TABLE "partners"
  ADD COLUMN IF NOT EXISTS "sponsored_enrollment" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "sponsorship_funding_source" "FundingSource",
  ADD COLUMN IF NOT EXISTS "sponsorship_term_label" TEXT,
  ADD COLUMN IF NOT EXISTS "sponsorship_starts_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "sponsorship_ends_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "sponsorship_seat_cap" INTEGER,
  ADD COLUMN IF NOT EXISTS "sponsorship_notes" TEXT,
  ADD COLUMN IF NOT EXISTS "enrollment_page_enabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "enrollment_headline" TEXT,
  ADD COLUMN IF NOT EXISTS "enrollment_blurb" TEXT,
  ADD COLUMN IF NOT EXISTS "school_district" TEXT;

-- 3. Curated per-partner program list.
CREATE TABLE IF NOT EXISTS "partner_program_catalog" (
    "id" TEXT NOT NULL,
    "partner_id" TEXT NOT NULL,
    "program_slug" TEXT NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partner_program_catalog_pkey" PRIMARY KEY ("id")
);

-- One row per (partner, program): re-adding a program updates the existing row
-- instead of duplicating it, which is what makes the seed helper idempotent.
CREATE UNIQUE INDEX IF NOT EXISTS "partner_program_catalog_partner_id_program_slug_key"
  ON "partner_program_catalog"("partner_id", "program_slug");

-- Serves the enrollment page's one query: this partner's programs, in order.
CREATE INDEX IF NOT EXISTS "partner_program_catalog_partner_id_display_order_idx"
  ON "partner_program_catalog"("partner_id", "display_order");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'partner_program_catalog_partner_id_fkey'
  ) THEN
    ALTER TABLE "partner_program_catalog"
      ADD CONSTRAINT "partner_program_catalog_partner_id_fkey"
      FOREIGN KEY ("partner_id") REFERENCES "partners"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- 4. Sponsorship provenance on the enrollment itself.
ALTER TABLE "course_enrollments"
  ADD COLUMN IF NOT EXISTS "sponsored_by_partner_id" TEXT;

-- Supports "how many seats has this partner sponsored" against the seat cap.
CREATE INDEX IF NOT EXISTS "course_enrollments_sponsored_by_partner_id_idx"
  ON "course_enrollments"("sponsored_by_partner_id");
