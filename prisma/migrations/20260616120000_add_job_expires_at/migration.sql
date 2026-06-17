-- Add expires_at column to jobs table for automatic job expiry
-- This allows jobs to have an expiration date beyond which they
-- are no longer shown on the public job board.

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS jobs_expires_at_idx ON jobs(expires_at);
