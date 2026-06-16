-- Sprint 2 Compliance: RECOVERY for failed migration 20260616050000_s2_compliance_fix_xapi_org_null
-- Date: 2026-06-16
--
-- The previous migration failed because it referenced xs.actor_identifier — a column
-- that does not exist on xapi_statements. The correct column is actor_account_name.
-- This migration is idempotent and safe to run multiple times.
--
-- Prerequisites: This migration assumes 20260616050000 has been marked as rolled-back
-- or resolved in the _prisma_migrations table. If it hasn't, run:
--   npx prisma migrate resolve --rolled-back 20260616050000_s2_compliance_fix_xapi_org_null
-- before applying this migration.

-- ============================================
-- SECTION 1: Ensure xapi_statements.organization_id exists
-- ============================================

ALTER TABLE IF EXISTS xapi_statements
  ADD COLUMN IF NOT EXISTS organization_id TEXT;

-- ============================================
-- SECTION 2: Safe backfill using correct column name (actor_account_name)
-- ============================================

-- Backfill from coursera_identity_mappings (with NULL-safe joins)
UPDATE xapi_statements xs
SET organization_id = (
  SELECT u.organization_id
  FROM coursera_identity_mappings cim
  JOIN users u ON u.id = cim.user_id
  WHERE xs.actor_email IS NOT NULL
    AND cim.coursera_email IS NOT NULL
    AND LOWER(xs.actor_email) = LOWER(cim.coursera_email)
  LIMIT 1
)
WHERE xs.organization_id IS NULL
  AND xs.actor_email IS NOT NULL;

-- Backfill from direct user lookup by email
UPDATE xapi_statements xs
SET organization_id = (
  SELECT u.organization_id
  FROM users u
  WHERE xs.actor_email IS NOT NULL
    AND u.email IS NOT NULL
    AND LOWER(u.email) = LOWER(xs.actor_email)
  LIMIT 1
)
WHERE xs.organization_id IS NULL
  AND xs.actor_email IS NOT NULL;

-- Backfill from direct user lookup by actor_account_name (CORRECTED from actor_identifier)
UPDATE xapi_statements xs
SET organization_id = (
  SELECT u.organization_id
  FROM users u
  WHERE xs.actor_account_name IS NOT NULL
    AND u.id::text = xs.actor_account_name
  LIMIT 1
)
WHERE xs.organization_id IS NULL
  AND xs.actor_account_name IS NOT NULL;

-- Set sentinel for any remaining unresolvable rows (should be rare)
UPDATE xapi_statements
SET organization_id = 'unresolved-' || LEFT(id::text, 8)
WHERE organization_id IS NULL;

-- Now safe to set NOT NULL
ALTER TABLE xapi_statements ALTER COLUMN organization_id SET NOT NULL;

-- Add index for tenant-scoped queries
CREATE INDEX IF NOT EXISTS xapi_statements_organization_id_idx
ON xapi_statements (organization_id);

-- ============================================
-- SECTION 3: Ingest trigger (idempotent, corrected)
-- ============================================

CREATE OR REPLACE FUNCTION xapi_statement_ingest_org_check()
RETURNS TRIGGER AS $$
DECLARE
  resolved_org_id TEXT;
BEGIN
  -- Allow if organization_id is already set (e.g., by the ingest pipeline)
  IF NEW.organization_id IS NOT NULL AND NEW.organization_id NOT LIKE 'unresolved-%' THEN
    RETURN NEW;
  END IF;

  -- Resolve from coursera_identity_mappings
  SELECT u.organization_id INTO resolved_org_id
  FROM coursera_identity_mappings cim
  JOIN users u ON u.id = cim.user_id
  WHERE (
    (NEW.actor_email IS NOT NULL AND LOWER(NEW.actor_email) = LOWER(cim.coursera_email))
    OR
    (NEW.actor_account_name IS NOT NULL AND NEW.actor_account_name = cim.actor_identifier)
  )
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

  -- Reject if unresolvable — admin health dashboard will flag these
  RAISE EXCEPTION 'xAPI statement ingest rejected: cannot resolve organization_id for actor_email=%, actor_account_name=%',
    NEW.actor_email, NEW.actor_account_name;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS xapi_statement_ingest_org_check ON xapi_statements;

CREATE TRIGGER xapi_statement_ingest_org_check
  BEFORE INSERT ON xapi_statements
  FOR EACH ROW
  EXECUTE FUNCTION xapi_statement_ingest_org_check();
