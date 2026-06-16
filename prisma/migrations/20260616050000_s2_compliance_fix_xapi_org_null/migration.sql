-- Sprint 2 Compliance: FIX for failed migration 20260614180000
-- Date: 2026-06-16
--
-- The previous migration failed because some xapi_statements rows could not
-- be backfilled (no matching actor_email or actor_identifier in users/cim).
-- This migration idempotently handles those edge cases.
--
-- ============================================
-- SECTION 1: Ensure GUC helpers are correct (idempotent)
-- ============================================

CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS TEXT AS $$
BEGIN
  RETURN NULLIF(COALESCE(current_setting('app.current_user_id', true), ''), '');
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_current_org_id()
RETURNS TEXT AS $$
BEGIN
  RETURN NULLIF(COALESCE(current_setting('app.current_org_id', true), ''), '');
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================
-- SECTION 2: xapi_statements organization_id — safe backfill + NOT NULL
-- ============================================

-- Add column if it doesn't exist (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'xapi_statements' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE xapi_statements ADD COLUMN organization_id TEXT;
  END IF;
END $$;

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

-- Backfill from direct user lookup by actor_identifier
UPDATE xapi_statements xs
SET organization_id = (
  SELECT u.organization_id
  FROM users u
  WHERE xs.actor_identifier IS NOT NULL
    AND u.id::text = xs.actor_identifier
  LIMIT 1
)
WHERE xs.organization_id IS NULL
  AND xs.actor_identifier IS NOT NULL;

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
-- SECTION 3: Ingest trigger (idempotent)
-- ============================================

CREATE OR REPLACE FUNCTION xapi_statement_ingest_org_check()
RETURNS TRIGGER AS $$
DECLARE
  resolved_org_id TEXT;
BEGIN
  IF NEW.organization_id IS NOT NULL AND NEW.organization_id NOT LIKE 'unresolved-%' THEN
    RETURN NEW;
  END IF;

  SELECT u.organization_id INTO resolved_org_id
  FROM coursera_identity_mappings cim
  JOIN users u ON u.id = cim.user_id
  WHERE NEW.actor_email IS NOT NULL
    AND cim.coursera_email IS NOT NULL
    AND LOWER(NEW.actor_email) = LOWER(cim.coursera_email)
  LIMIT 1;

  IF resolved_org_id IS NULL AND NEW.actor_email IS NOT NULL THEN
    SELECT u.organization_id INTO resolved_org_id
    FROM users u
    WHERE u.email IS NOT NULL
      AND LOWER(u.email) = LOWER(NEW.actor_email)
    LIMIT 1;
  END IF;

  IF resolved_org_id IS NOT NULL THEN
    NEW.organization_id := resolved_org_id;
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'xAPI statement ingest rejected: cannot resolve organization_id for actor_email=%, actor_identifier=%',
    NEW.actor_email, NEW.actor_identifier;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS xapi_statement_ingest_org_check ON xapi_statements;

CREATE TRIGGER xapi_statement_ingest_org_check
  BEFORE INSERT ON xapi_statements
  FOR EACH ROW
  EXECUTE FUNCTION xapi_statement_ingest_org_check();
