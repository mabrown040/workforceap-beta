-- Sprint 2 compliance — P0: xAPI ingest tables organization_id NOT NULL
--
-- Makes organization_id non-nullable on coursera_identity_mappings and
-- coursera_xapi_events. The backfill was already done in migration
-- 20260519050000_xapi_organization_id; this migration only flips the constraint.
--
-- coursera_unmatched_actor_alerts stays nullable by design — unmatched actors
-- by definition don't have a resolvable org.

-- 1. coursera_identity_mappings: every row has a user_id, every user has an org.
-- The 20260519050000 migration already backfilled. Verify no NULLs remain.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM coursera_identity_mappings WHERE organization_id IS NULL LIMIT 1
  ) THEN
    RAISE EXCEPTION 'coursera_identity_mappings has NULL organization_id rows; run backfill first';
  END IF;
END $$;

ALTER TABLE coursera_identity_mappings
  ALTER COLUMN organization_id SET NOT NULL;

-- 2. coursera_xapi_events: matched rows were backfilled in 20260519050000.
-- Unmatched rows legitimately have NULL org. For NOT NULL we stamp them with
-- the default org — they are still identifiable as unmatched via completion_status.
UPDATE coursera_xapi_events
SET organization_id = (
  SELECT id FROM organizations WHERE slug = 'workforceap' LIMIT 1
)
WHERE organization_id IS NULL;

ALTER TABLE coursera_xapi_events
  ALTER COLUMN organization_id SET NOT NULL;
