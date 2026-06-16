-- Sprint 2 Compliance: Fix empty-string GUC normalization + xAPI organization_id NOT NULL
-- Date: 2026-06-14
--
-- Problem: get_current_org_id() returns '' (empty string) when the GUC is unset,
-- but SQL checks use `co IS NOT NULL` which evaluates TRUE for ''.
-- This breaks org-scoped RLS policies when the layout GUC is empty.
--
-- Fix: Wrap get_current_org_id() with NULLIF(..., '') so empty string → NULL.
-- Also apply NULLIF to get_current_user_id() for consistency.
--
-- Also: xapi_statements.organization_id is nullable but should be NOT NULL
-- with a default for tenant isolation. Add the column if missing, backfill
-- from user row, then set NOT NULL.

-- ============================================
-- SECTION 1: Fix GUC helper functions
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
-- SECTION 2: xapi_statements organization_id NOT NULL
-- ============================================

-- Add column if it doesn't exist (idempotent for environments that already have it)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'xapi_statements' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE xapi_statements ADD COLUMN organization_id TEXT;
  END IF;
END $$;

-- Backfill organization_id from the actor's user row via coursera_identity_mappings
-- or direct user lookup. For statements without a resolvable actor, set to a
-- sentinel value that can be reviewed later.
UPDATE xapi_statements xs
SET organization_id = COALESCE(
  -- Try to resolve via coursera_identity_mappings
  (
    SELECT u.organization_id
    FROM coursera_identity_mappings cim
    JOIN users u ON u.id = cim.user_id
    WHERE (
      (xs.actor_email IS NOT NULL AND LOWER(xs.actor_email) = LOWER(cim.coursera_email))
    )
    LIMIT 1
  ),
  -- Fallback: direct user lookup by email
  (
    SELECT u.organization_id
    FROM users u
    WHERE LOWER(u.email) = LOWER(xs.actor_email)
    LIMIT 1
  ),
  -- Sentinel for unresolvable actors — will be reviewed in admin health dashboard
  'unresolved-' || LEFT(xs.id::text, 8)
)
WHERE xs.organization_id IS NULL;

-- Set NOT NULL after backfill
ALTER TABLE xapi_statements ALTER COLUMN organization_id SET NOT NULL;

-- Add index for tenant-scoped queries
CREATE INDEX IF NOT EXISTS xapi_statements_organization_id_idx
ON xapi_statements (organization_id);

-- ============================================
-- SECTION 3: Add ingest filter for xAPI statements without organization_id
-- ============================================

-- This trigger rejects xAPI statements that cannot be resolved to an organization
-- at ingest time, preventing future NULL organization_id rows.
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
  RAISE EXCEPTION 'xAPI statement ingest rejected: cannot resolve organization_id for actor_email=%',
    NEW.actor_email;
END;
$$ LANGUAGE plpgsql;

-- Drop if exists to allow idempotent re-runs
DROP TRIGGER IF EXISTS xapi_statement_ingest_org_check ON xapi_statements;

CREATE TRIGGER xapi_statement_ingest_org_check
  BEFORE INSERT ON xapi_statements
  FOR EACH ROW
  EXECUTE FUNCTION xapi_statement_ingest_org_check();

-- ============================================
-- SECTION 4: Verify helper functions
-- ============================================

-- Test that NULLIF correctly normalizes empty string to NULL
DO $$
DECLARE
  test_result TEXT;
BEGIN
  PERFORM set_config('app.current_org_id', '', true);
  test_result := get_current_org_id();
  IF test_result IS NOT NULL THEN
    RAISE EXCEPTION 'get_current_org_id() did not normalize empty string to NULL: got %', test_result;
  END IF;

  PERFORM set_config('app.current_org_id', 'org_123', true);
  test_result := get_current_org_id();
  IF test_result != 'org_123' THEN
    RAISE EXCEPTION 'get_current_org_id() did not return real org ID: got %', test_result;
  END IF;

  PERFORM set_config('app.current_org_id', '', true);
  test_result := get_current_user_id();
  IF test_result IS NOT NULL THEN
    RAISE EXCEPTION 'get_current_user_id() did not normalize empty string to NULL: got %', test_result;
  END IF;

  PERFORM set_config('app.current_user_id', 'user_123', true);
  test_result := get_current_user_id();
  IF test_result != 'user_123' THEN
    RAISE EXCEPTION 'get_current_user_id() did not return real user ID: got %', test_result;
  END IF;
END $$;
