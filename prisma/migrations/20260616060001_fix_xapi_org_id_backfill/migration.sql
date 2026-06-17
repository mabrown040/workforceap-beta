-- Migration recovery: 20260614180000_s2_compliance_guc_nullif_xapi_org failed
-- because xapi_statements backfill left some rows with NULL organization_id.
-- This migration idempotently fixes the issue.
--
-- AFTER this migration deploys successfully, run:
--   npx prisma migrate resolve --applied 20260614180000_s2_compliance_guc_nullif_xapi_org
-- to mark the original failed migration as resolved in _prisma_migrations.

-- ============================================
-- SECTION 1: Ensure all xapi_statements have a non-NULL organization_id
-- ============================================

-- First, handle any remaining NULL organization_id rows with a safe sentinel
UPDATE xapi_statements xs
SET organization_id = 'unresolved-' || LEFT(COALESCE(xs.id::text, 'no-id'), 8)
WHERE xs.organization_id IS NULL;

-- ============================================
-- SECTION 2: Make organization_id NOT NULL if not already
-- ============================================

-- This is idempotent — safe to re-run
DO $$
BEGIN
  -- Only set NOT NULL if the column exists and is nullable
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'xapi_statements'
      AND column_name = 'organization_id'
      AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE xapi_statements ALTER COLUMN organization_id SET NOT NULL;
  END IF;
END $$;

-- ============================================
-- SECTION 3: Ensure index exists
-- ============================================

CREATE INDEX IF NOT EXISTS xapi_statements_organization_id_idx
ON xapi_statements (organization_id);

-- ============================================
-- SECTION 4: Mark the failed migration as resolved (if Prisma tracks it)
-- ============================================

-- Note: Prisma's _prisma_migrations table records failed migrations.
-- An operator with DB access should run:
--   UPDATE _prisma_migrations SET finished_at = NOW(), applied_steps_count = 1
--   WHERE migration_name = '20260614180000_s2_compliance_guc_nullif_xapi_org'
--     AND finished_at IS NULL;
-- Or use: prisma migrate resolve --applied 20260614180000_s2_compliance_guc_nullif_xapi_org
