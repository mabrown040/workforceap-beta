-- Add composite index on (organization_id, deleted_at) for users.
--
-- Every admin/counselor list, export, and analytics query filters on this
-- exact pair (tenant scope + active/soft-deleted state). Only single-column
-- indexes existed on organization_id and deleted_at individually, which
-- forces Postgres to intersect two index scans (or fall back to a seq scan)
-- instead of using one composite index.

CREATE INDEX IF NOT EXISTS users_organization_id_deleted_at_idx
  ON users (organization_id, deleted_at);
