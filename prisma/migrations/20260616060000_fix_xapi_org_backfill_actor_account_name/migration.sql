-- Sprint 2 Compliance Fix: Correct xapi_statements organization_id backfill
-- Date: 2026-06-16
--
-- Fixes the failed migration 20260614180000_s2_compliance_guc_nullif_xapi_org
-- which referenced xs.actor_identifier — a column that does not exist on
-- xapi_statements. The correct column is actor_account_name.
--
-- This migration is idempotent: safe to re-run if partially applied.
--
-- Prerequisites (should already be in place from the failed migration):
--   - organization_id column exists on xapi_statements
--   - get_current_user_id() and get_current_org_id() are NULLIF-wrapped
--
-- What this migration does:
--   1. Backfill organization_id from coursera_identity_mappings via
--      actor_account_name (corrected from actor_identifier).
--   2. Backfill remaining rows from direct user lookup by email.
--   3. Stamp any still-unresolved rows with the default org.
--   4. Set organization_id NOT NULL.
--   5. Create index for tenant-scoped queries.
--   6. Create / replace the ingest trigger with the corrected column name.
--
-- ---------------------------------------------------------------------------
-- 1. Ensure column exists (idempotent)
-- ---------------------------------------------------------------------------

ALTER TABLE IF EXISTS xapi_statements
  ADD COLUMN IF NOT EXISTS organization_id TEXT;

-- ---------------------------------------------------------------------------
-- 2. Backfill via coursera_identity_mappings using actor_account_name
-- ---------------------------------------------------------------------------

UPDATE xapi_statements xs
SET organization_id = COALESCE(
  -- Primary: resolve via coursera_identity_mappings using actor_account_name
  (
    SELECT u.organization_id
    FROM coursera_identity_mappings cim
    JOIN users u ON u.id = cim.user_id
    WHERE xs.actor_account_name IS NOT NULL
      AND xs.actor_account_name = cim.actor_identifier
    LIMIT 1
  ),
  -- Fallback: direct user lookup by email
  (
    SELECT u.organization_id
    FROM users u
    WHERE LOWER(u.email) = LOWER(xs.actor_email)
    LIMIT 1
  ),
  -- Sentinel for unresolvable actors
  'unresolved-' || LEFT(xs.id::text, 8)
)
WHERE xs.organization_id IS NULL;

-- ---------------------------------------------------------------------------
-- 3. Stamp any remaining NULLs with default org so NOT NULL succeeds
-- ---------------------------------------------------------------------------

UPDATE xapi_statements
SET organization_id = (
  SELECT id FROM organizations WHERE slug = 'workforceap' LIMIT 1
)
WHERE organization_id IS NULL;

-- ---------------------------------------------------------------------------
-- 4. Make NOT NULL
-- ---------------------------------------------------------------------------

ALTER TABLE xapi_statements
  ALTER COLUMN organization_id SET NOT NULL;

-- ---------------------------------------------------------------------------
-- 5. Index for tenant-scoped queries
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS xapi_statements_organization_id_idx
  ON xapi_statements (organization_id);

-- ---------------------------------------------------------------------------
-- 6. Ingest trigger with corrected column name
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION xapi_statement_ingest_org_check()
RETURNS TRIGGER AS $$
DECLARE
  resolved_org_id TEXT;
BEGIN
  -- Allow if organization_id is already set (e.g., by the ingest pipeline)
  IF NEW.organization_id IS NOT NULL AND NEW.organization_id NOT LIKE 'unresolved-%' THEN
    RETURN NEW;
  END IF;

  -- Resolve from coursera_identity_mappings using actor_account_name
  SELECT u.organization_id INTO resolved_org_id
  FROM coursera_identity_mappings cim
  JOIN users u ON u.id = cim.user_id
  WHERE NEW.actor_account_name IS NOT NULL
    AND NEW.actor_account_name = cim.actor_identifier
  LIMIT 1;

  -- Fallback: direct user lookup
  IF resolved_org_id IS NULL AND NEW.actor_email IS NOT NULL THEN
    SELECT u.organization_id INTO resolved_org_id
    FROM users u
    WHERE LOWER(u.email) = LOWER(NEW.actor_email)
    LIMIT 1;
  END IF;

  IF resolved_org_id IS NOT NULL THEN
    NEW.organization_id := resolved_org_id;
    RETURN NEW;
  END IF;

  -- Set sentinel instead of rejecting — prevents ingestion failures
  NEW.organization_id := 'unresolved-' || LEFT(NEW.id::text, 8);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS xapi_statement_ingest_org_check ON xapi_statements;

CREATE TRIGGER xapi_statement_ingest_org_check
  BEFORE INSERT ON xapi_statements
  FOR EACH ROW
  EXECUTE FUNCTION xapi_statement_ingest_org_check();
