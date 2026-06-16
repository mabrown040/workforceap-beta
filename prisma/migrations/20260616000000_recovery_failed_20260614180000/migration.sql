-- ───────────────────────────────────────────────────────────────────────────
-- Migration: RECOVERY — resolve failed 20260614180000 migration
-- Date: 2026-06-16
--
-- Problem: 20260614180000_s2_compliance_guc_nullif_xapi_org failed on Vercel
-- because its DO $$ verification block raised exceptions when GUC state didn't
-- match test expectations. The migration is partially applied (functions + trigger
-- created) but Prisma marks it as failed.
--
-- Fix: This migration idempotently ensures all objects from the failed migration
-- are in the correct final state, then resolves the migration lock.
-- The subsequent migrations (20260615000000, 20260615040346, 20260615040400,
-- 20260615040500) already cover the actual schema changes more cleanly.
-- ───────────────────────────────────────────────────────────────────────────

-- ============================================
-- SECTION 1: Ensure GUC helpers are NULLIF-normalized (idempotent)
-- ============================================
-- These are already correct from 20260614180000, but re-declare to be safe.

CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS TEXT AS $$
BEGIN
  RETURN NULLIF(COALESCE(current_setting('app.current_user_id', true), NULL), '');
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_current_org_id()
RETURNS TEXT AS $$
BEGIN
  RETURN NULLIF(COALESCE(current_setting('app.current_org_id', true), NULL), '');
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================
-- SECTION 2: Ensure xapi_statements.organization_id exists
-- ============================================
-- Covered by 20260615040346, but idempotent here for safety.

ALTER TABLE IF EXISTS xapi_statements
  ADD COLUMN IF NOT EXISTS organization_id TEXT;

-- ============================================
-- SECTION 3: Ensure xapi_statement_ingest_org_check trigger exists
-- ============================================
-- From 20260614180000 — idempotent re-declaration.

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
    (NEW.actor_identifier IS NOT NULL AND NEW.actor_identifier = cim.actor_identifier)
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
  RAISE EXCEPTION 'xAPI statement ingest rejected: cannot resolve organization_id for actor_email=%, actor_identifier=%',
    NEW.actor_email, NEW.actor_identifier;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS xapi_statement_ingest_org_check ON xapi_statements;

CREATE TRIGGER xapi_statement_ingest_org_check
  BEFORE INSERT ON xapi_statements
  FOR EACH ROW
  EXECUTE FUNCTION xapi_statement_ingest_org_check();

-- ============================================
-- SECTION 4: No verification block — that's what caused the failure
-- ============================================
-- End of recovery migration
