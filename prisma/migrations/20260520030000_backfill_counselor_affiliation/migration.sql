-- Backfill counselor affiliation for partner-invited counselors that were
-- silently persisted as 'wap_staff' because the invite-accept flow did not
-- set affiliation explicitly and the column defaults to 'wap_staff'.
--
-- A counselor with a non-null partner_id is, by definition, partner-affiliated.
-- Independent advisors are out of scope for this backfill — they are only ever
-- created via the admin API which has always set affiliation explicitly.

UPDATE "counselors"
SET "affiliation" = 'partner'
WHERE "partner_id" IS NOT NULL
  AND "affiliation" = 'wap_staff';

-- Sanity check: no partner-linked counselor should still be wap_staff.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "counselors"
    WHERE "partner_id" IS NOT NULL
      AND "affiliation" = 'wap_staff'
  ) THEN
    RAISE EXCEPTION 'Backfill failed: partner-linked counselors still have wap_staff affiliation';
  END IF;
END $$;
