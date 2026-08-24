-- WS4: additive eligibility screening columns for unemployment / benefits /
-- attribution questions. Nullable so existing rows and school/CHS signups
-- that skip the adult screener remain valid.
ALTER TABLE apply_eligibility_screenings
  ADD COLUMN IF NOT EXISTS receiving_unemployment text,
  ADD COLUMN IF NOT EXISTS exhausted_unemployment text,
  ADD COLUMN IF NOT EXISTS layoff_company text,
  ADD COLUMN IF NOT EXISTS snap_wic text,
  ADD COLUMN IF NOT EXISTS hear_about text,
  ADD COLUMN IF NOT EXISTS hear_about_other text,
  ADD COLUMN IF NOT EXISTS partner_ambassador_referral text;
