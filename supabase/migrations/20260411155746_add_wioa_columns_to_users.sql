
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS wioa_qualification_json JSONB,
  ADD COLUMN IF NOT EXISTS wioa_review_status TEXT,
  ADD COLUMN IF NOT EXISTS wioa_reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS wioa_review_notes TEXT,
  ADD COLUMN IF NOT EXISTS wioa_reviewed_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL;
;
