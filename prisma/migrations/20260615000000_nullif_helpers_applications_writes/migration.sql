-- ───────────────────────────────────────────────────────────────────────────
-- Migration: NULLIF helpers + applications write policies for FORCE RLS
-- Date: 2026-06-15
--
-- Problem: The app sets empty-string ('') for missing GUC values via
-- buildGucSql (lib/db/prisma.ts). PostgreSQL treats '' IS NOT NULL, so
-- helpers like get_current_org_id() return '' instead of NULL, breaking
-- org-checking policies and admin lookups under FORCE ROW LEVEL SECURITY.
--
-- Fix: Wrap helper returns with NULLIF(..., '') so empty GUC values are
-- normalized to NULL before IS NOT NULL checks.
--
-- Also: applications table had no INSERT/UPDATE/DELETE policies — writes
-- would hard-fail under FORCE. Add owner/admin/counselor write policies
-- mirroring the goals_* pattern.
--
-- Also: resources_select_all used get_current_user_id() IS NOT NULL which
-- passes for '' (since '' IS NOT NULL). Fix with NULLIF normalization.
-- ───────────────────────────────────────────────────────────────────────────

-- ============================================
-- SECTION 1: Normalize GUC helpers with NULLIF
-- ============================================

-- get_current_user_id: empty string → NULL
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS TEXT AS $$
BEGIN
  RETURN NULLIF(COALESCE(current_setting('app.current_user_id', true), NULL), '');
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- get_current_org_id: empty string → NULL
CREATE OR REPLACE FUNCTION get_current_org_id()
RETURNS TEXT AS $$
BEGIN
  RETURN NULLIF(COALESCE(current_setting('app.current_org_id', true), NULL), '');
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- get_current_role: unchanged — role is never empty string in app contract
CREATE OR REPLACE FUNCTION get_current_role()
RETURNS TEXT AS $$
BEGIN
  RETURN COALESCE(current_setting('app.current_role', true), NULL);
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================
-- SECTION 2: applications write policies
-- ============================================
-- Pattern: owner INSERT/UPDATE/DELETE. Admins and counselors inherit
-- via is_admin_for_member_data / is_counselor_for_member helpers.
-- These helpers already use get_current_user_id() and get_current_org_id()
-- which are now NULLIF-normalized.

-- INSERT
DROP POLICY IF EXISTS "applications_insert_own" ON applications;
CREATE POLICY "applications_insert_own" ON applications
  FOR INSERT WITH CHECK (user_id = get_current_user_id());

DROP POLICY IF EXISTS "applications_insert_admin" ON applications;
CREATE POLICY "applications_insert_admin" ON applications
  FOR INSERT WITH CHECK (is_admin_for_member_data(user_id));

DROP POLICY IF EXISTS "applications_insert_counselor" ON applications;
CREATE POLICY "applications_insert_counselor" ON applications
  FOR INSERT WITH CHECK (is_counselor_for_member(user_id));

-- UPDATE
DROP POLICY IF EXISTS "applications_update_own" ON applications;
CREATE POLICY "applications_update_own" ON applications
  FOR UPDATE USING (user_id = get_current_user_id())
           WITH CHECK (user_id = get_current_user_id());

DROP POLICY IF EXISTS "applications_update_admin" ON applications;
CREATE POLICY "applications_update_admin" ON applications
  FOR UPDATE USING (is_admin_for_member_data(user_id))
           WITH CHECK (is_admin_for_member_data(user_id));

DROP POLICY IF EXISTS "applications_update_counselor" ON applications;
CREATE POLICY "applications_update_counselor" ON applications
  FOR UPDATE USING (is_counselor_for_member(user_id))
           WITH CHECK (is_counselor_for_member(user_id));

-- DELETE
DROP POLICY IF EXISTS "applications_delete_own" ON applications;
CREATE POLICY "applications_delete_own" ON applications
  FOR DELETE USING (user_id = get_current_user_id());

DROP POLICY IF EXISTS "applications_delete_admin" ON applications;
CREATE POLICY "applications_delete_admin" ON applications
  FOR DELETE USING (is_admin_for_member_data(user_id));

-- ============================================
-- SECTION 3: Fix resources_select_all empty-string bypass
-- ============================================
-- The original policy: get_current_user_id() IS NOT NULL
-- With empty-string GUC: '' IS NOT NULL → TRUE → anonymous reads allowed
-- Fix: NULLIF(get_current_user_id(),'') IS NOT NULL

DROP POLICY IF EXISTS "resources_select_all" ON resources;
CREATE POLICY "resources_select_all" ON resources
  FOR SELECT USING (NULLIF(get_current_user_id(), '') IS NOT NULL);

-- ============================================
-- End of migration
-- ============================================
