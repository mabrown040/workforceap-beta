-- Saved jobs: lets members bookmark job postings so the weekly job-alert
-- cron can tell who's actively job searching (saved job, application, or AI match).
CREATE TABLE IF NOT EXISTS saved_jobs (
  id TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, job_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_jobs_user_id ON saved_jobs(user_id);
