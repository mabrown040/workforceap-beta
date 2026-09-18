-- Additive adult-screener columns: split underemployed from unemployed
-- and persist the household size used for the poverty-guideline dropdown.
ALTER TABLE apply_eligibility_screenings
  ADD COLUMN IF NOT EXISTS underemployed text,
  ADD COLUMN IF NOT EXISTS household_size integer;
