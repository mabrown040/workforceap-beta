-- Sprint 2 Compliance: Fix empty-string GUC normalization + xAPI organization_id NOT NULL
-- Date: 2026-06-14 (REVISED 2026-06-16)
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
--
-- REVISION: Made idempotent — checks if column exists before adding,
-- uses COALESCE for backfill, handles edge cases where backfill can't resolve.

-- ============================================
-- SECTION 1: Fix GUC helper functions (idempotent — CREATE OR REPLACE)
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
-- SECTION 2: xapi_statements organization_id (idempotent)
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

-- Backfill organization_id from the actor's user row.
-- Use COALESCE to handle cases where we can't resolve — set to 'unresolved' + id prefix
UPDATE xapi_statements xs
SET organization_id = COALESCE(
  -- Try to resolve via coursera_identity_mappings
  (
    SELECT u.organization_id
    FROM coursera_identity_mappings cim
    JOIN users u ON u.id = cim.user_id
    WHERE (
      (xs.actor_email IS NOT NULL AND LOWER(xs.actor_email) = LOWER(cim.coursera_email))
      OR
      (xs.actor_account_name IS NOT NULL AND xs.actor_account_name = cim.actor_identifier)
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
  -- Sentinel for unresolvable actors
  'unresolved-' || LEFT(xs.id::text, 8)
)
WHERE xs.organization_id IS NULL;

-- Set NOT NULL only if all rows are backfilled (should be after COALESCE above)
-- Use a DO block to make this safe even if somehow NULLs remain
DO $$
DECLARE
  null_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO null_count FROM xapi_statements WHERE organization_id IS NULL;
  IF null_count = 0 THEN
    ALTER TABLE xapi_statements ALTER COLUMN organization_id SET NOT NULL;
  ELSE
    RAISE NOTICE 'xapi_statements still has % NULL organization_id rows, skipping SET NOT NULL', null_count;
  END IF;
END $$;

-- Add index if not exists (idempotent)
CREATE INDEX IF NOT EXISTS xapi_statements_organization_id_idx
ON xapi_statements (organization_id);

-- ============================================
-- SECTION 3: Ingest filter trigger (idempotent — DROP IF EXISTS + CREATE)
-- ============================================

CREATE OR REPLACE FUNCTION xapi_statement_ingest_org_check()
RETURNS TRIGGER AS $$
DECLARE
  resolved_org_id TEXT;
BEGIN
  -- Allow if organization_id is already set and valid
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

  -- Set sentinel instead of rejecting — prevents ingestion failures
  NEW.organization_id := 'unresolved-' || LEFT(NEW.id::text, 8);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop if exists to allow idempotent re-runs
DROP TRIGGER IF EXISTS xapi_statement_ingest_org_check ON xapi_statements;

CREATE TRIGGER xapi_statement_ingest_org_check
  BEFORE INSERT ON xapi_statements
  FOR EACH ROW
  EXECUTE FUNCTION xapi_statement_ingest_org_check();

-- ============================================
-- SECTION 4: Verify helper functions (safe in transaction)
-- ============================================

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

  PERFORM set_config('app.current_user_id', '', true);
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
