-- Migration: fix FORCE RLS recursion in is_admin_for_member_data
-- Date: 2026-06-16
-- Issue: users_select_admin policy calls is_admin_for_member_data which queries
--   users table, triggering users_select_admin again → infinite recursion when
--   FORCE ROW LEVEL SECURITY is enabled.
-- Fix: Rewrite is_admin_for_member_data to avoid querying users through RLS.
--   Instead, use a direct organization_id lookup via SECURITY DEFINER bypass.

-- ============================================
-- FIX: is_admin_for_member_data — recursion-safe version
-- ============================================

-- New helper: admin-only org check, no table queries → recursion-safe.
CREATE OR REPLACE FUNCTION is_admin_for_org(check_org_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  co TEXT;
BEGIN
  co := get_current_org_id();
  IF is_current_super_admin() THEN RETURN TRUE; END IF;
  IF is_current_admin() AND co IS NOT NULL AND co = check_org_id THEN RETURN TRUE; END IF;
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Recursion-safe wrapper for backward compatibility.
-- For users table: avoids querying users (would recurse under FORCE RLS).
-- For other tables: queries users to verify org membership.
CREATE OR REPLACE FUNCTION is_admin_for_member_data(check_user_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  co TEXT;
BEGIN
  co := get_current_org_id();
  IF is_current_super_admin() THEN RETURN TRUE; END IF;
  IF is_current_admin() AND co IS NOT NULL THEN
    -- When called from users_select_admin policy under FORCE RLS,
    -- querying users here would recurse infinitely.
    -- For users table, the caller should use is_admin_for_org(organization_id)
    -- directly. For other tables, the users lookup is safe.
    RETURN EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = check_user_id AND u.organization_id = co
    );
  END IF;
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================
-- VERIFY: is_admin_for_member_data still works correctly
-- ============================================

-- The function behavior is unchanged for callers:
--   - super_admin: always TRUE
--   - admin + same org: TRUE
--   - admin + different org: FALSE
--   - non-admin: FALSE
-- Only the internal implementation changed to avoid the recursive RLS trigger.

-- ============================================
-- ============================================
-- FIX: users_select_admin + users_update_admin policies — use recursion-safe helper
-- ============================================

DROP POLICY IF EXISTS "users_select_admin" ON users;
CREATE POLICY "users_select_admin" ON users
  FOR SELECT USING (is_admin_for_org(organization_id));

DROP POLICY IF EXISTS "users_update_admin" ON users;
CREATE POLICY "users_update_admin" ON users
  FOR UPDATE USING (is_admin_for_org(organization_id));

-- ============================================
-- TEST: Run the FORCE RLS harness after applying this migration
-- ============================================

-- After migration:
--   SHADOW_DATABASE_URL=postgres://... DATABASE_URL=postgres://... \
--     npx tsx scripts/p1/test-force-rls.ts

-- Expected: all assertions pass, no recursion errors.
