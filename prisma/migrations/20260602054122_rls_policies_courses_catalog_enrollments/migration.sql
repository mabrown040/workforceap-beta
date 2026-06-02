-- RLS policies for three tables that previously had RLS ENABLED but
-- ZERO policies attached. With RLS enabled and no policies, the
-- *intended* behavior would be "deny all", but `FORCE ROW LEVEL
-- SECURITY` is currently deferred system-wide (see migration
-- 20260514000000_defer_rls_force_authorize_system), which means the
-- table-owner connection bypasses policies entirely. Once FORCE is
-- re-enabled (the post-launch hardening step), these three tables
-- would silently lock out every consumer.
--
-- Background: surfaced by the 2026-06-02 RLS audit run. All three
-- tables expose member-program-catalog data scoped per organization.
--
-- Pattern: mirror the policies on `employers` / `organization_program_catalog`-adjacent
-- tables — use the existing `can_access_org_row(text)` and
-- `is_current_admin()` helpers added in 20260513040000, and gate by
-- `organization_id` which is present on all three tables.
--
-- - SELECT: any user in the same org can read; admins of the org can read.
-- - INSERT / UPDATE / DELETE: admin-only (org-scoped). Members do not
--   write to courses, the catalog, or their own enrollments directly —
--   enrollment is admin-driven via /api/admin/members/[id]/coursera-enrollment-approval
--   and program catalog mutations live behind /api/admin/programs.
--
-- Idempotent (DROP POLICY IF EXISTS guards).

-- ============================================================
-- courses
-- ============================================================
DROP POLICY IF EXISTS "courses_select_org" ON courses;
CREATE POLICY "courses_select_org" ON courses
  FOR SELECT USING (can_access_org_row(organization_id));

DROP POLICY IF EXISTS "courses_insert_admin" ON courses;
CREATE POLICY "courses_insert_admin" ON courses
  FOR INSERT WITH CHECK (can_access_org_row(organization_id) AND is_current_admin());

DROP POLICY IF EXISTS "courses_update_admin" ON courses;
CREATE POLICY "courses_update_admin" ON courses
  FOR UPDATE USING (can_access_org_row(organization_id) AND is_current_admin());

DROP POLICY IF EXISTS "courses_delete_admin" ON courses;
CREATE POLICY "courses_delete_admin" ON courses
  FOR DELETE USING (can_access_org_row(organization_id) AND is_current_admin());

-- ============================================================
-- organization_program_catalog
-- ============================================================
DROP POLICY IF EXISTS "organization_program_catalog_select_org" ON organization_program_catalog;
CREATE POLICY "organization_program_catalog_select_org" ON organization_program_catalog
  FOR SELECT USING (can_access_org_row(organization_id));

DROP POLICY IF EXISTS "organization_program_catalog_insert_admin" ON organization_program_catalog;
CREATE POLICY "organization_program_catalog_insert_admin" ON organization_program_catalog
  FOR INSERT WITH CHECK (can_access_org_row(organization_id) AND is_current_admin());

DROP POLICY IF EXISTS "organization_program_catalog_update_admin" ON organization_program_catalog;
CREATE POLICY "organization_program_catalog_update_admin" ON organization_program_catalog
  FOR UPDATE USING (can_access_org_row(organization_id) AND is_current_admin());

DROP POLICY IF EXISTS "organization_program_catalog_delete_admin" ON organization_program_catalog;
CREATE POLICY "organization_program_catalog_delete_admin" ON organization_program_catalog
  FOR DELETE USING (can_access_org_row(organization_id) AND is_current_admin());

-- ============================================================
-- course_enrollments
-- ============================================================
-- Membership is per-user; member can see their own row, anyone in the
-- org can see all rows in the same org for roster views, admins of the
-- org can mutate.

ALTER TABLE course_enrollments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "course_enrollments_select_self" ON course_enrollments;
CREATE POLICY "course_enrollments_select_self" ON course_enrollments
  FOR SELECT USING (user_id = get_current_user_id());

DROP POLICY IF EXISTS "course_enrollments_select_org" ON course_enrollments;
CREATE POLICY "course_enrollments_select_org" ON course_enrollments
  FOR SELECT USING (can_access_org_row(organization_id));

DROP POLICY IF EXISTS "course_enrollments_insert_admin" ON course_enrollments;
CREATE POLICY "course_enrollments_insert_admin" ON course_enrollments
  FOR INSERT WITH CHECK (can_access_org_row(organization_id) AND is_current_admin());

DROP POLICY IF EXISTS "course_enrollments_update_admin" ON course_enrollments;
CREATE POLICY "course_enrollments_update_admin" ON course_enrollments
  FOR UPDATE USING (can_access_org_row(organization_id) AND is_current_admin());

DROP POLICY IF EXISTS "course_enrollments_delete_admin" ON course_enrollments;
CREATE POLICY "course_enrollments_delete_admin" ON course_enrollments
  FOR DELETE USING (can_access_org_row(organization_id) AND is_current_admin());
