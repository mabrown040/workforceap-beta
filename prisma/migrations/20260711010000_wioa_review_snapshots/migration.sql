-- Roadmap Phase 0 (Blocks funding): immutable WIOA decision record.
--
-- wioa_review_status on `users` and `status` on `applications` are both
-- mutable columns overwritten on every change. There is currently no way
-- to answer "what eligibility data justified this decision, and who made
-- it, at the moment it was made" -- exactly what a WIOA monitoring review
-- asks for. This table is append-only: rows are created, never updated or
-- deleted; a correction is recorded as a new row.
--
-- user_id / application_id are plain columns, not foreign keys. GDPR
-- right-to-erasure (POST /api/admin/members/[id]/erase) hard-deletes the
-- users row and cascades to applications -- a federal audit record must
-- survive that erasure, so the subject is identified by id plus frozen
-- email/name snapshot columns, same rationale already used by
-- audit_logs.actor_email_snapshot.

CREATE TABLE IF NOT EXISTS wioa_review_snapshots (
  id                     TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  organization_id        TEXT NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  user_id                TEXT NOT NULL,
  member_email_snapshot  TEXT NOT NULL,
  member_name_snapshot   TEXT NOT NULL,
  application_id         TEXT,
  source                 TEXT NOT NULL,
  decision               TEXT NOT NULL,
  notes                  TEXT,
  actor_user_id          TEXT REFERENCES users(id) ON DELETE SET NULL,
  actor_email_snapshot   TEXT,
  actor_role_snapshot    TEXT,
  eligibility_snapshot   JSONB NOT NULL,
  created_at             TIMESTAMP(3) NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS wioa_review_snapshots_user_id_created_at_idx
  ON wioa_review_snapshots (user_id, created_at);

CREATE INDEX IF NOT EXISTS wioa_review_snapshots_org_id_created_at_idx
  ON wioa_review_snapshots (organization_id, created_at);

CREATE INDEX IF NOT EXISTS wioa_review_snapshots_application_id_idx
  ON wioa_review_snapshots (application_id);
