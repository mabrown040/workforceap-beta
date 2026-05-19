-- Sprint P1 (multi-tenancy finalization, AUDIT-2026-05-16 §C-S5)
--
-- The xAPI ingest tables (coursera_identity_mappings, coursera_xapi_events,
-- coursera_unmatched_actor_alerts) were created without an organization_id
-- column. Once multi-tenancy is fully enforced this becomes a cross-tenant
-- leak: a learner mapped under Org A would resolve to any org via xAPI
-- ingest, and completions would credit the wrong tenant. PII payloads
-- (raw_payload JSONB) would also pool cross-tenant.
--
-- Fix: add organization_id to all three tables, backfill from the matched
-- user's organization, and add indexes so the new column is the primary
-- filter for every lookup. Read filters in lib/xapi/mappings.ts are
-- updated in a follow-up commit; this migration only adds the data layer.
--
-- We leave organization_id nullable for now because unmatched events
-- legitimately don't know the org (Coursera doesn't tell us). After the
-- backfill stabilizes in prod we can revisit NOT NULL on
-- coursera_identity_mappings (where every row maps to a user with an org).

-- ── coursera_identity_mappings ────────────────────────────────────────
-- Every mapping has a user_id; every user has an organization_id. Safe to
-- backfill from users and indexable as the primary lookup key.
ALTER TABLE IF EXISTS coursera_identity_mappings
  ADD COLUMN IF NOT EXISTS organization_id TEXT;

UPDATE coursera_identity_mappings cim
SET organization_id = u.organization_id
FROM users u
WHERE cim.user_id = u.id
  AND cim.organization_id IS NULL;

CREATE INDEX IF NOT EXISTS coursera_identity_mappings_org_id_idx
  ON coursera_identity_mappings (organization_id);

CREATE INDEX IF NOT EXISTS coursera_identity_mappings_org_actor_idx
  ON coursera_identity_mappings (organization_id, actor_identifier, COALESCE(actor_home_page, ''))
  WHERE actor_identifier IS NOT NULL;

CREATE INDEX IF NOT EXISTS coursera_identity_mappings_org_email_idx
  ON coursera_identity_mappings (organization_id, LOWER(coursera_email))
  WHERE coursera_email IS NOT NULL;

-- ── coursera_xapi_events ──────────────────────────────────────────────
-- Backfill from matched_user_id where present. Unmatched events stay NULL
-- (they failed to route to a user, so we don't know their org either).
ALTER TABLE IF EXISTS coursera_xapi_events
  ADD COLUMN IF NOT EXISTS organization_id TEXT;

UPDATE coursera_xapi_events e
SET organization_id = u.organization_id
FROM users u
WHERE e.matched_user_id = u.id
  AND e.organization_id IS NULL;

CREATE INDEX IF NOT EXISTS coursera_xapi_events_org_id_idx
  ON coursera_xapi_events (organization_id, received_at DESC);

-- ── coursera_unmatched_actor_alerts ───────────────────────────────────
-- Unmatched alerts are global by definition (we don't know which tenant
-- the actor belongs to). Column exists for future use if we ever route
-- unmatched events by domain/inbound-route hint.
ALTER TABLE IF EXISTS coursera_unmatched_actor_alerts
  ADD COLUMN IF NOT EXISTS organization_id TEXT;
