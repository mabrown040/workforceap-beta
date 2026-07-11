-- Continuation of AUDIT-2026-05-16 §C-S5 / migration 20260519050000_xapi_organization_id.
--
-- coursera_course_progress and coursera_badge_progress (the CSV-import raw
-- tables backing the admin "unmatched learners" + badge-progress views) were
-- never given an organization_id column when the sibling xAPI ingest tables
-- (coursera_identity_mappings, coursera_xapi_events, coursera_unmatched_actor_alerts)
-- were fixed for this exact gap. Cross-tenant PII leak the moment a second
-- org's Coursera data exists: loadUnmatchedLearners / loadBadgeProgressSummary
-- (lib/coursera/progressQueries.ts) return every org's rows to any admin.
--
-- Same pattern as 20260519050000: add nullable column, backfill from the
-- matched user's organization, leave unmatched rows (user_id IS NULL) NULL —
-- we genuinely don't know their org until a mapping resolves them. Query-side
-- filtering lands in a follow-up commit; this migration only adds the data layer.

-- ── coursera_course_progress ──────────────────────────────────────────
ALTER TABLE IF EXISTS coursera_course_progress
  ADD COLUMN IF NOT EXISTS organization_id TEXT;

UPDATE coursera_course_progress cp
SET organization_id = u.organization_id
FROM users u
WHERE cp.user_id = u.id
  AND cp.organization_id IS NULL;

CREATE INDEX IF NOT EXISTS coursera_course_progress_org_id_idx
  ON coursera_course_progress (organization_id, last_activity_time DESC);

-- ── coursera_badge_progress ───────────────────────────────────────────
ALTER TABLE IF EXISTS coursera_badge_progress
  ADD COLUMN IF NOT EXISTS organization_id TEXT;

UPDATE coursera_badge_progress bp
SET organization_id = u.organization_id
FROM users u
WHERE bp.user_id = u.id
  AND bp.organization_id IS NULL;

CREATE INDEX IF NOT EXISTS coursera_badge_progress_org_id_idx
  ON coursera_badge_progress (organization_id, last_activity_time DESC);
