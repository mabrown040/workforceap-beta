-- Add case-insensitive unique index on email for active (non-deleted) users.
-- Prevents the "3 Michael Browns" duplicate issue at the database level.
-- Partial index (deleted_at IS NULL) allows duplicates among soft-deleted users.

CREATE UNIQUE INDEX IF NOT EXISTS "users_email_lower_unique"
  ON "users" (LOWER(email))
  WHERE deleted_at IS NULL;
