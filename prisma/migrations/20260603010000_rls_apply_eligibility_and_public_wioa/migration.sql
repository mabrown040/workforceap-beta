-- RLS policies for apply_eligibility_screenings and public_wioa_screenings
--
-- Both tables were added in the 2026-06-02 sprint (PR #1529) and carry
-- organization_id. They were not covered by the earlier RLS policy sweep
-- because they did not exist yet.
--
-- Pattern: same as pre_screening_responses — member can read their own,
-- admin can read/write within their org, counselors can read within org.
--
-- Idempotent (DROP POLICY IF EXISTS guards).

-- ============================================================
-- apply_eligibility_screenings
-- ============================================================

ALTER TABLE apply_eligibility_screenings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "apply_eligibility_screenings_select_own" ON apply_eligibility_screenings;
CREATE POLICY "apply_eligibility_screenings_select_own" ON apply_eligibility_screenings
  FOR SELECT USING (user_id = get_current_user_id());

DROP POLICY IF EXISTS "apply_eligibility_screenings_select_admin" ON apply_eligibility_screenings;
CREATE POLICY "apply_eligibility_screenings_select_admin" ON apply_eligibility_screenings
  FOR SELECT USING (can_access_org_row(organization_id) AND is_current_admin());

DROP POLICY IF EXISTS "apply_eligibility_screenings_select_counselor" ON apply_eligibility_screenings;
CREATE POLICY "apply_eligibility_screenings_select_counselor" ON apply_eligibility_screenings
  FOR SELECT USING (can_access_org_row(organization_id) AND is_current_counselor());

DROP POLICY IF EXISTS "apply_eligibility_screenings_insert_admin" ON apply_eligibility_screenings;
CREATE POLICY "apply_eligibility_screenings_insert_admin" ON apply_eligibility_screenings
  FOR INSERT WITH CHECK (can_access_org_row(organization_id) AND is_current_admin());

DROP POLICY IF EXISTS "apply_eligibility_screenings_update_admin" ON apply_eligibility_screenings;
CREATE POLICY "apply_eligibility_screenings_update_admin" ON apply_eligibility_screenings
  FOR UPDATE USING (can_access_org_row(organization_id) AND is_current_admin());

DROP POLICY IF EXISTS "apply_eligibility_screenings_delete_admin" ON apply_eligibility_screenings;
CREATE POLICY "apply_eligibility_screenings_delete_admin" ON apply_eligibility_screenings
  FOR DELETE USING (can_access_org_row(organization_id) AND is_current_admin());

-- ============================================================
-- public_wioa_screenings
-- ============================================================
-- These are anonymous submissions (no user_id). They are created by the
-- public WIOA qualification page and read by admin/counselor in the org.
-- Members cannot read them (no user_id to match).

ALTER TABLE public_wioa_screenings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_wioa_screenings_select_admin" ON public_wioa_screenings;
CREATE POLICY "public_wioa_screenings_select_admin" ON public_wioa_screenings
  FOR SELECT USING (can_access_org_row(organization_id) AND is_current_admin());

DROP POLICY IF EXISTS "public_wioa_screenings_select_counselor" ON public_wioa_screenings;
CREATE POLICY "public_wioa_screenings_select_counselor" ON public_wioa_screenings
  FOR SELECT USING (can_access_org_row(organization_id) AND is_current_counselor());

DROP POLICY IF EXISTS "public_wioa_screenings_insert_public" ON public_wioa_screenings;
CREATE POLICY "public_wioa_screenings_insert_public" ON public_wioa_screenings
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "public_wioa_screenings_update_admin" ON public_wioa_screenings;
CREATE POLICY "public_wioa_screenings_update_admin" ON public_wioa_screenings
  FOR UPDATE USING (can_access_org_row(organization_id) AND is_current_admin());

DROP POLICY IF EXISTS "public_wioa_screenings_delete_admin" ON public_wioa_screenings;
CREATE POLICY "public_wioa_screenings_delete_admin" ON public_wioa_screenings
  FOR DELETE USING (can_access_org_row(organization_id) AND is_current_admin());
