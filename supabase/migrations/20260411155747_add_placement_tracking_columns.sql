
ALTER TABLE placement_records
  ADD COLUMN IF NOT EXISTS program_slug TEXT,
  ADD COLUMN IF NOT EXISTS wage_at_follow_up INTEGER,
  ADD COLUMN IF NOT EXISTS retention_status TEXT,
  ADD COLUMN IF NOT EXISTS start_date_verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS funding_source TEXT,
  ADD COLUMN IF NOT EXISTS grant_reporting_notes TEXT;
;
