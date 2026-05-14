-- ============================================
-- RLS Migration: Defense in Depth (Track A.3)
-- Date: 2026-05-13
-- ============================================
-- Prerequisites:
--   1. Application sets GUCs via Prisma middleware:
--      SET LOCAL app.current_user_id = '<uuid>';
--      SET LOCAL app.current_org_id = '<uuid>';
--      SET LOCAL app.current_role = 'member|admin|counselor|employer|partner|super_admin';
--      SET LOCAL app.current_employer_id = '<uuid>';  -- if role = employer
--      SET LOCAL app.current_partner_id = '<uuid>';   -- if role = partner
--   2. Service-role connections (cron, webhooks) bypass RLS or set GUCs
--   3. DO NOT RUN in production until Prisma middleware is deployed
-- ============================================

-- ============================================
-- SECTION 1: Helper Functions
-- ============================================

-- Get current user ID from GUC (set by application middleware)
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS TEXT AS $$
BEGIN
  RETURN COALESCE(current_setting('app.current_user_id', true), NULL);
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Get current org ID from GUC
CREATE OR REPLACE FUNCTION get_current_org_id()
RETURNS TEXT AS $$
BEGIN
  RETURN COALESCE(current_setting('app.current_org_id', true), NULL);
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Get current role from GUC
CREATE OR REPLACE FUNCTION get_current_role()
RETURNS TEXT AS $$
BEGIN
  RETURN COALESCE(current_setting('app.current_role', true), NULL);
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Check if current user is admin or super_admin
CREATE OR REPLACE FUNCTION is_current_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN get_current_role() IN ('admin', 'super_admin');
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Check if current user is super_admin
CREATE OR REPLACE FUNCTION is_current_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN get_current_role() = 'super_admin';
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Check if current user is counselor for given member
CREATE OR REPLACE FUNCTION is_counselor_for_member(check_member_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  cu TEXT;
BEGIN
  cu := get_current_user_id();
  IF cu IS NULL THEN RETURN FALSE; END IF;
  RETURN EXISTS (
    SELECT 1 FROM counselor_assignments ca
    JOIN counselors c ON ca.counselor_id = c.id
    WHERE ca.member_id = check_member_id
      AND c.user_id = cu
      AND ca.active = true
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Check if current user is admin for a member's data (same org, admin role)
CREATE OR REPLACE FUNCTION is_admin_for_member_data(check_user_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  co TEXT;
BEGIN
  co := get_current_org_id();
  IF is_current_super_admin() THEN RETURN TRUE; END IF;
  IF is_current_admin() AND co IS NOT NULL THEN
    RETURN EXISTS (
      SELECT 1 FROM users u WHERE u.id = check_user_id AND u.organization_id = co
    );
  END IF;
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Check if current user can access org-scoped row
CREATE OR REPLACE FUNCTION can_access_org_row(check_org_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  co TEXT;
BEGIN
  co := get_current_org_id();
  IF is_current_super_admin() THEN RETURN TRUE; END IF;
  IF is_current_admin() AND co IS NOT NULL AND co = check_org_id THEN RETURN TRUE; END IF;
  -- Members and other roles can read org-scoped public data
  IF co IS NOT NULL AND co = check_org_id THEN RETURN TRUE; END IF;
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Check if current user is the employer owner
CREATE OR REPLACE FUNCTION is_current_employer(check_employer_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  cu TEXT;
BEGIN
  cu := get_current_user_id();
  IF cu IS NULL THEN RETURN FALSE; END IF;
  RETURN EXISTS (
    SELECT 1 FROM employers e
    WHERE e.id = check_employer_id AND e.user_id = cu
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Check if current user is partner owner
CREATE OR REPLACE FUNCTION is_current_partner(check_partner_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  cu TEXT;
  cp TEXT;
BEGIN
  cu := get_current_user_id();
  cp := COALESCE(current_setting('app.current_partner_id', true), NULL);
  IF cp IS NOT NULL AND cp = check_partner_id THEN RETURN TRUE; END IF;
  IF cu IS NULL THEN RETURN FALSE; END IF;
  RETURN EXISTS (
    SELECT 1 FROM partner_users pu
    WHERE pu.partner_id = check_partner_id AND pu.user_id = cu
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================
-- SECTION 2: Enable RLS on all P0 + P1 tables
-- ============================================

-- Core member data
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE readiness_checklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE benefit_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_change_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_recaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE pathway_step_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_access_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_tool_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_ai_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_program_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE pre_screening_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE pre_screening_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE placement_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE placed_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE counselor_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE counselor_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_outreach_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_posting_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal_workflow_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_job_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_next_best_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE at_risk_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE placement_surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE coursera_course_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE coursera_badge_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE coursera_skillset_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE coursera_identity_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE xapi_statements ENABLE ROW LEVEL SECURITY;

-- P1 business data
ALTER TABLE employers ENABLE ROW LEVEL SECURITY;
ALTER TABLE employer_hiring_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE counselors ENABLE ROW LEVEL SECURITY;
ALTER TABLE subgroups ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_subgroups ENABLE ROW LEVEL SECURITY;
ALTER TABLE subgroup_leaders ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_program_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE employer_screening_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE coursera_canonical_course_mappings ENABLE ROW LEVEL SECURITY;

-- P2 system tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- SECTION 3: users (core identity + org anchor)
-- ============================================

DROP POLICY IF EXISTS "users_select_own" ON users;
CREATE POLICY "users_select_own" ON users
  FOR SELECT USING (id = get_current_user_id());

DROP POLICY IF EXISTS "users_select_admin" ON users;
CREATE POLICY "users_select_admin" ON users
  FOR SELECT USING (is_admin_for_member_data(id));

DROP POLICY IF EXISTS "users_select_counselor" ON users;
CREATE POLICY "users_select_counselor" ON users
  FOR SELECT USING (is_counselor_for_member(id));

DROP POLICY IF EXISTS "users_update_own" ON users;
CREATE POLICY "users_update_own" ON users
  FOR UPDATE USING (id = get_current_user_id())
  WITH CHECK (id = get_current_user_id());

DROP POLICY IF EXISTS "users_update_admin" ON users;
CREATE POLICY "users_update_admin" ON users
  FOR UPDATE USING (is_admin_for_member_data(id));

-- ============================================
-- SECTION 4: profiles (PII)
-- ============================================

DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (user_id = get_current_user_id());

DROP POLICY IF EXISTS "profiles_select_admin" ON profiles;
CREATE POLICY "profiles_select_admin" ON profiles
  FOR SELECT USING (is_admin_for_member_data(user_id));

DROP POLICY IF EXISTS "profiles_select_counselor" ON profiles;
CREATE POLICY "profiles_select_counselor" ON profiles
  FOR SELECT USING (is_counselor_for_member(user_id));

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (user_id = get_current_user_id())
  WITH CHECK (user_id = get_current_user_id());

DROP POLICY IF EXISTS "profiles_update_admin" ON profiles;
CREATE POLICY "profiles_update_admin" ON profiles
  FOR UPDATE USING (is_admin_for_member_data(user_id));

-- ============================================
-- SECTION 5: Member data tables (user_id FK)
-- ============================================

-- applications
DROP POLICY IF EXISTS "applications_select_own" ON applications;
CREATE POLICY "applications_select_own" ON applications FOR SELECT USING (user_id = get_current_user_id());
DROP POLICY IF EXISTS "applications_select_admin" ON applications;
CREATE POLICY "applications_select_admin" ON applications FOR SELECT USING (is_admin_for_member_data(user_id));
DROP POLICY IF EXISTS "applications_select_counselor" ON applications;
CREATE POLICY "applications_select_counselor" ON applications FOR SELECT USING (is_counselor_for_member(user_id));

-- job_applications
DROP POLICY IF EXISTS "job_applications_select_own" ON job_applications;
CREATE POLICY "job_applications_select_own" ON job_applications FOR SELECT USING (user_id = get_current_user_id());
DROP POLICY IF EXISTS "job_applications_select_admin" ON job_applications;
CREATE POLICY "job_applications_select_admin" ON job_applications FOR SELECT USING (is_admin_for_member_data(user_id));
DROP POLICY IF EXISTS "job_applications_select_counselor" ON job_applications;
CREATE POLICY "job_applications_select_counselor" ON job_applications FOR SELECT USING (is_counselor_for_member(user_id));
DROP POLICY IF EXISTS "job_applications_insert_own" ON job_applications;
CREATE POLICY "job_applications_insert_own" ON job_applications FOR INSERT WITH CHECK (user_id = get_current_user_id());
DROP POLICY IF EXISTS "job_applications_update_own" ON job_applications;
CREATE POLICY "job_applications_update_own" ON job_applications FOR UPDATE USING (user_id = get_current_user_id());
DROP POLICY IF EXISTS "job_applications_delete_own" ON job_applications;
CREATE POLICY "job_applications_delete_own" ON job_applications FOR DELETE USING (user_id = get_current_user_id());

-- readiness_checklist
DROP POLICY IF EXISTS "readiness_checklist_select_own" ON readiness_checklist;
CREATE POLICY "readiness_checklist_select_own" ON readiness_checklist FOR SELECT USING (user_id = get_current_user_id());
DROP POLICY IF EXISTS "readiness_checklist_select_admin" ON readiness_checklist;
CREATE POLICY "readiness_checklist_select_admin" ON readiness_checklist FOR SELECT USING (is_admin_for_member_data(user_id));
DROP POLICY IF EXISTS "readiness_checklist_select_counselor" ON readiness_checklist;
CREATE POLICY "readiness_checklist_select_counselor" ON readiness_checklist FOR SELECT USING (is_counselor_for_member(user_id));

-- benefit_requests
DROP POLICY IF EXISTS "benefit_requests_select_own" ON benefit_requests;
CREATE POLICY "benefit_requests_select_own" ON benefit_requests FOR SELECT USING (user_id = get_current_user_id());
DROP POLICY IF EXISTS "benefit_requests_select_admin" ON benefit_requests;
CREATE POLICY "benefit_requests_select_admin" ON benefit_requests FOR SELECT USING (is_admin_for_member_data(user_id));
DROP POLICY IF EXISTS "benefit_requests_select_counselor" ON benefit_requests;
CREATE POLICY "benefit_requests_select_counselor" ON benefit_requests FOR SELECT USING (is_counselor_for_member(user_id));

-- program_change_requests
DROP POLICY IF EXISTS "program_change_requests_select_own" ON program_change_requests;
CREATE POLICY "program_change_requests_select_own" ON program_change_requests FOR SELECT USING (user_id = get_current_user_id());
DROP POLICY IF EXISTS "program_change_requests_select_admin" ON program_change_requests;
CREATE POLICY "program_change_requests_select_admin" ON program_change_requests FOR SELECT USING (is_admin_for_member_data(user_id));
DROP POLICY IF EXISTS "program_change_requests_select_counselor" ON program_change_requests;
CREATE POLICY "program_change_requests_select_counselor" ON program_change_requests FOR SELECT USING (is_counselor_for_member(user_id));

-- learning_progress
DROP POLICY IF EXISTS "learning_progress_select_own" ON learning_progress;
CREATE POLICY "learning_progress_select_own" ON learning_progress FOR SELECT USING (user_id = get_current_user_id());
DROP POLICY IF EXISTS "learning_progress_select_admin" ON learning_progress;
CREATE POLICY "learning_progress_select_admin" ON learning_progress FOR SELECT USING (is_admin_for_member_data(user_id));
DROP POLICY IF EXISTS "learning_progress_select_counselor" ON learning_progress;
CREATE POLICY "learning_progress_select_counselor" ON learning_progress FOR SELECT USING (is_counselor_for_member(user_id));

-- goals
DROP POLICY IF EXISTS "goals_select_own" ON goals;
CREATE POLICY "goals_select_own" ON goals FOR SELECT USING (user_id = get_current_user_id());
DROP POLICY IF EXISTS "goals_select_admin" ON goals;
CREATE POLICY "goals_select_admin" ON goals FOR SELECT USING (is_admin_for_member_data(user_id));
DROP POLICY IF EXISTS "goals_select_counselor" ON goals;
CREATE POLICY "goals_select_counselor" ON goals FOR SELECT USING (is_counselor_for_member(user_id));

-- resource_progress
DROP POLICY IF EXISTS "resource_progress_select_own" ON resource_progress;
CREATE POLICY "resource_progress_select_own" ON resource_progress FOR SELECT USING (user_id = get_current_user_id());
DROP POLICY IF EXISTS "resource_progress_select_admin" ON resource_progress;
CREATE POLICY "resource_progress_select_admin" ON resource_progress FOR SELECT USING (is_admin_for_member_data(user_id));
DROP POLICY IF EXISTS "resource_progress_select_counselor" ON resource_progress;
CREATE POLICY "resource_progress_select_counselor" ON resource_progress FOR SELECT USING (is_counselor_for_member(user_id));

-- member_events
DROP POLICY IF EXISTS "member_events_select_own" ON member_events;
CREATE POLICY "member_events_select_own" ON member_events FOR SELECT USING (user_id = get_current_user_id());
DROP POLICY IF EXISTS "member_events_select_admin" ON member_events;
CREATE POLICY "member_events_select_admin" ON member_events FOR SELECT USING (is_admin_for_member_data(user_id));
DROP POLICY IF EXISTS "member_events_select_counselor" ON member_events;
CREATE POLICY "member_events_select_counselor" ON member_events FOR SELECT USING (is_counselor_for_member(user_id));

-- weekly_recaps
DROP POLICY IF EXISTS "weekly_recaps_select_own" ON weekly_recaps;
CREATE POLICY "weekly_recaps_select_own" ON weekly_recaps FOR SELECT USING (user_id = get_current_user_id());
DROP POLICY IF EXISTS "weekly_recaps_select_admin" ON weekly_recaps;
CREATE POLICY "weekly_recaps_select_admin" ON weekly_recaps FOR SELECT USING (is_admin_for_member_data(user_id));
DROP POLICY IF EXISTS "weekly_recaps_select_counselor" ON weekly_recaps;
CREATE POLICY "weekly_recaps_select_counselor" ON weekly_recaps FOR SELECT USING (is_counselor_for_member(user_id));

-- pathway_step_progress
DROP POLICY IF EXISTS "pathway_step_progress_select_own" ON pathway_step_progress;
CREATE POLICY "pathway_step_progress_select_own" ON pathway_step_progress FOR SELECT USING (user_id = get_current_user_id());
DROP POLICY IF EXISTS "pathway_step_progress_select_admin" ON pathway_step_progress;
CREATE POLICY "pathway_step_progress_select_admin" ON pathway_step_progress FOR SELECT USING (is_admin_for_member_data(user_id));
DROP POLICY IF EXISTS "pathway_step_progress_select_counselor" ON pathway_step_progress;
CREATE POLICY "pathway_step_progress_select_counselor" ON pathway_step_progress FOR SELECT USING (is_counselor_for_member(user_id));

-- training_access_requests
DROP POLICY IF EXISTS "training_access_requests_select_own" ON training_access_requests;
CREATE POLICY "training_access_requests_select_own" ON training_access_requests FOR SELECT USING (user_id = get_current_user_id());
DROP POLICY IF EXISTS "training_access_requests_select_admin" ON training_access_requests;
CREATE POLICY "training_access_requests_select_admin" ON training_access_requests FOR SELECT USING (is_admin_for_member_data(user_id));
DROP POLICY IF EXISTS "training_access_requests_select_counselor" ON training_access_requests;
CREATE POLICY "training_access_requests_select_counselor" ON training_access_requests FOR SELECT USING (is_counselor_for_member(user_id));

-- ai_tool_results
DROP POLICY IF EXISTS "ai_tool_results_select_own" ON ai_tool_results;
CREATE POLICY "ai_tool_results_select_own" ON ai_tool_results FOR SELECT USING (user_id = get_current_user_id());
DROP POLICY IF EXISTS "ai_tool_results_select_admin" ON ai_tool_results;
CREATE POLICY "ai_tool_results_select_admin" ON ai_tool_results FOR SELECT USING (is_admin_for_member_data(user_id));

-- application_ai_feedback
DROP POLICY IF EXISTS "application_ai_feedback_select_own" ON application_ai_feedback;
CREATE POLICY "application_ai_feedback_select_own" ON application_ai_feedback FOR SELECT USING (user_id = get_current_user_id());
DROP POLICY IF EXISTS "application_ai_feedback_select_admin" ON application_ai_feedback;
CREATE POLICY "application_ai_feedback_select_admin" ON application_ai_feedback FOR SELECT USING (is_admin_for_member_data(user_id));

-- user_certifications
DROP POLICY IF EXISTS "user_certifications_select_own" ON user_certifications;
CREATE POLICY "user_certifications_select_own" ON user_certifications FOR SELECT USING (user_id = get_current_user_id());
DROP POLICY IF EXISTS "user_certifications_select_admin" ON user_certifications;
CREATE POLICY "user_certifications_select_admin" ON user_certifications FOR SELECT USING (is_admin_for_member_data(user_id));
DROP POLICY IF EXISTS "user_certifications_select_counselor" ON user_certifications;
CREATE POLICY "user_certifications_select_counselor" ON user_certifications FOR SELECT USING (is_counselor_for_member(user_id));

-- course_progress
DROP POLICY IF EXISTS "course_progress_select_own" ON course_progress;
CREATE POLICY "course_progress_select_own" ON course_progress FOR SELECT USING (user_id = get_current_user_id());
DROP POLICY IF EXISTS "course_progress_select_admin" ON course_progress;
CREATE POLICY "course_progress_select_admin" ON course_progress FOR SELECT USING (is_admin_for_member_data(user_id));
DROP POLICY IF EXISTS "course_progress_select_counselor" ON course_progress;
CREATE POLICY "course_progress_select_counselor" ON course_progress FOR SELECT USING (is_counselor_for_member(user_id));

-- member_program_progress
DROP POLICY IF EXISTS "member_program_progress_select_own" ON member_program_progress;
CREATE POLICY "member_program_progress_select_own" ON member_program_progress FOR SELECT USING (user_id = get_current_user_id());
DROP POLICY IF EXISTS "member_program_progress_select_admin" ON member_program_progress;
CREATE POLICY "member_program_progress_select_admin" ON member_program_progress FOR SELECT USING (is_admin_for_member_data(user_id));
DROP POLICY IF EXISTS "member_program_progress_select_counselor" ON member_program_progress;
CREATE POLICY "member_program_progress_select_counselor" ON member_program_progress FOR SELECT USING (is_counselor_for_member(user_id));

-- pre_screening_drafts
DROP POLICY IF EXISTS "pre_screening_drafts_select_own" ON pre_screening_drafts;
CREATE POLICY "pre_screening_drafts_select_own" ON pre_screening_drafts FOR SELECT USING (user_id = get_current_user_id());
DROP POLICY IF EXISTS "pre_screening_drafts_select_admin" ON pre_screening_drafts;
CREATE POLICY "pre_screening_drafts_select_admin" ON pre_screening_drafts FOR SELECT USING (is_admin_for_member_data(user_id));

-- placement_records
DROP POLICY IF EXISTS "placement_records_select_own" ON placement_records;
CREATE POLICY "placement_records_select_own" ON placement_records FOR SELECT USING (user_id = get_current_user_id());
DROP POLICY IF EXISTS "placement_records_select_admin" ON placement_records;
CREATE POLICY "placement_records_select_admin" ON placement_records FOR SELECT USING (is_admin_for_member_data(user_id));
DROP POLICY IF EXISTS "placement_records_select_counselor" ON placement_records;
CREATE POLICY "placement_records_select_counselor" ON placement_records FOR SELECT USING (is_counselor_for_member(user_id));

-- placed_outcomes
DROP POLICY IF EXISTS "placed_outcomes_select_own" ON placed_outcomes;
CREATE POLICY "placed_outcomes_select_own" ON placed_outcomes FOR SELECT USING (user_id = get_current_user_id());
DROP POLICY IF EXISTS "placed_outcomes_select_admin" ON placed_outcomes;
CREATE POLICY "placed_outcomes_select_admin" ON placed_outcomes FOR SELECT USING (is_admin_for_member_data(user_id));
DROP POLICY IF EXISTS "placed_outcomes_select_counselor" ON placed_outcomes;
CREATE POLICY "placed_outcomes_select_counselor" ON placed_outcomes FOR SELECT USING (is_counselor_for_member(user_id));

-- at_risk_alerts
DROP POLICY IF EXISTS "at_risk_alerts_select_own" ON at_risk_alerts;
CREATE POLICY "at_risk_alerts_select_own" ON at_risk_alerts FOR SELECT USING (user_id = get_current_user_id());
DROP POLICY IF EXISTS "at_risk_alerts_select_admin" ON at_risk_alerts;
CREATE POLICY "at_risk_alerts_select_admin" ON at_risk_alerts FOR SELECT USING (is_admin_for_member_data(user_id));
DROP POLICY IF EXISTS "at_risk_alerts_select_counselor" ON at_risk_alerts;
CREATE POLICY "at_risk_alerts_select_counselor" ON at_risk_alerts FOR SELECT USING (is_counselor_for_member(user_id));

-- placement_surveys
DROP POLICY IF EXISTS "placement_surveys_select_own" ON placement_surveys;
CREATE POLICY "placement_surveys_select_own" ON placement_surveys FOR SELECT USING (user_id = get_current_user_id());
DROP POLICY IF EXISTS "placement_surveys_select_admin" ON placement_surveys;
CREATE POLICY "placement_surveys_select_admin" ON placement_surveys FOR SELECT USING (is_admin_for_member_data(user_id));

-- testimonials
DROP POLICY IF EXISTS "testimonials_select_own" ON testimonials;
CREATE POLICY "testimonials_select_own" ON testimonials FOR SELECT USING (member_id = get_current_user_id());
DROP POLICY IF EXISTS "testimonials_select_admin" ON testimonials;
CREATE POLICY "testimonials_select_admin" ON testimonials FOR SELECT USING (is_admin_for_member_data(member_id));

-- coursera_course_progress
DROP POLICY IF EXISTS "coursera_course_progress_select_own" ON coursera_course_progress;
CREATE POLICY "coursera_course_progress_select_own" ON coursera_course_progress FOR SELECT USING (user_id = get_current_user_id());
DROP POLICY IF EXISTS "coursera_course_progress_select_admin" ON coursera_course_progress;
CREATE POLICY "coursera_course_progress_select_admin" ON coursera_course_progress FOR SELECT USING (is_admin_for_member_data(user_id));

-- coursera_badge_progress
DROP POLICY IF EXISTS "coursera_badge_progress_select_own" ON coursera_badge_progress;
CREATE POLICY "coursera_badge_progress_select_own" ON coursera_badge_progress FOR SELECT USING (user_id = get_current_user_id());
DROP POLICY IF EXISTS "coursera_badge_progress_select_admin" ON coursera_badge_progress;
CREATE POLICY "coursera_badge_progress_select_admin" ON coursera_badge_progress FOR SELECT USING (is_admin_for_member_data(user_id));

-- coursera_skillset_progress
DROP POLICY IF EXISTS "coursera_skillset_progress_select_own" ON coursera_skillset_progress;
CREATE POLICY "coursera_skillset_progress_select_own" ON coursera_skillset_progress FOR SELECT USING (user_id = get_current_user_id());
DROP POLICY IF EXISTS "coursera_skillset_progress_select_admin" ON coursera_skillset_progress;
CREATE POLICY "coursera_skillset_progress_select_admin" ON coursera_skillset_progress FOR SELECT USING (is_admin_for_member_data(user_id));

-- coursera_identity_mappings
DROP POLICY IF EXISTS "coursera_identity_mappings_select_own" ON coursera_identity_mappings;
CREATE POLICY "coursera_identity_mappings_select_own" ON coursera_identity_mappings FOR SELECT USING (user_id = get_current_user_id());
DROP POLICY IF EXISTS "coursera_identity_mappings_select_admin" ON coursera_identity_mappings;
CREATE POLICY "coursera_identity_mappings_select_admin" ON coursera_identity_mappings FOR SELECT USING (is_admin_for_member_data(user_id));

-- xapi_statements (heuristic: match by actor_email -> users.email)
DROP POLICY IF EXISTS "xapi_statements_select_own" ON xapi_statements;
CREATE POLICY "xapi_statements_select_own" ON xapi_statements FOR SELECT USING (
  actor_email IS NOT NULL AND EXISTS (
    SELECT 1 FROM users u WHERE u.email = xapi_statements.actor_email AND u.id = get_current_user_id()
  )
);
DROP POLICY IF EXISTS "xapi_statements_select_admin" ON xapi_statements;
CREATE POLICY "xapi_statements_select_admin" ON xapi_statements FOR SELECT USING (
  actor_email IS NOT NULL AND EXISTS (
    SELECT 1 FROM users u WHERE u.email = xapi_statements.actor_email AND is_admin_for_member_data(u.id)
  )
);

-- pre_screening_responses (has organization_id directly)
DROP POLICY IF EXISTS "pre_screening_responses_select_own" ON pre_screening_responses;
CREATE POLICY "pre_screening_responses_select_own" ON pre_screening_responses FOR SELECT USING (user_id = get_current_user_id());
DROP POLICY IF EXISTS "pre_screening_responses_select_admin" ON pre_screening_responses;
CREATE POLICY "pre_screening_responses_select_admin" ON pre_screening_responses FOR SELECT USING (can_access_org_row(organization_id) AND is_current_admin());
DROP POLICY IF EXISTS "pre_screening_responses_insert_own" ON pre_screening_responses;
CREATE POLICY "pre_screening_responses_insert_own" ON pre_screening_responses FOR INSERT WITH CHECK (user_id = get_current_user_id());

-- member_points (one row per user)
DROP POLICY IF EXISTS "member_points_select_own" ON member_points;
CREATE POLICY "member_points_select_own" ON member_points FOR SELECT USING (user_id = get_current_user_id());
DROP POLICY IF EXISTS "member_points_select_admin" ON member_points;
CREATE POLICY "member_points_select_admin" ON member_points FOR SELECT USING (is_admin_for_member_data(user_id));
DROP POLICY IF EXISTS "member_points_select_counselor" ON member_points;
CREATE POLICY "member_points_select_counselor" ON member_points FOR SELECT USING (is_counselor_for_member(user_id));

-- points_transactions
DROP POLICY IF EXISTS "points_transactions_select_own" ON points_transactions;
CREATE POLICY "points_transactions_select_own" ON points_transactions FOR SELECT USING (user_id = get_current_user_id());
DROP POLICY IF EXISTS "points_transactions_select_admin" ON points_transactions;
CREATE POLICY "points_transactions_select_admin" ON points_transactions FOR SELECT USING (is_admin_for_member_data(user_id));

-- member_next_best_actions (uses member_id)
DROP POLICY IF EXISTS "member_next_best_actions_select_own" ON member_next_best_actions;
CREATE POLICY "member_next_best_actions_select_own" ON member_next_best_actions FOR SELECT USING (member_id = get_current_user_id());
DROP POLICY IF EXISTS "member_next_best_actions_update_own" ON member_next_best_actions;
CREATE POLICY "member_next_best_actions_update_own" ON member_next_best_actions FOR UPDATE USING (member_id = get_current_user_id());
DROP POLICY IF EXISTS "member_next_best_actions_select_admin" ON member_next_best_actions;
CREATE POLICY "member_next_best_actions_select_admin" ON member_next_best_actions FOR SELECT USING (is_admin_for_member_data(member_id));
DROP POLICY IF EXISTS "member_next_best_actions_select_counselor" ON member_next_best_actions;
CREATE POLICY "member_next_best_actions_select_counselor" ON member_next_best_actions FOR SELECT USING (is_counselor_for_member(member_id));

-- ============================================
-- SECTION 6: Linkage tables — counselor / partner
-- ============================================

-- counselor_assignments
DROP POLICY IF EXISTS "counselor_assignments_select_member" ON counselor_assignments;
CREATE POLICY "counselor_assignments_select_member" ON counselor_assignments FOR SELECT USING (member_id = get_current_user_id());
DROP POLICY IF EXISTS "counselor_assignments_select_counselor" ON counselor_assignments;
CREATE POLICY "counselor_assignments_select_counselor" ON counselor_assignments FOR SELECT USING (
  EXISTS (SELECT 1 FROM counselors c WHERE c.id = counselor_assignments.counselor_id AND c.user_id = get_current_user_id())
);
DROP POLICY IF EXISTS "counselor_assignments_select_admin" ON counselor_assignments;
CREATE POLICY "counselor_assignments_select_admin" ON counselor_assignments FOR SELECT USING (is_admin_for_member_data(member_id));
DROP POLICY IF EXISTS "counselor_assignments_modify_admin" ON counselor_assignments;
CREATE POLICY "counselor_assignments_modify_admin" ON counselor_assignments FOR ALL USING (is_admin_for_member_data(member_id)) WITH CHECK (is_admin_for_member_data(member_id));

-- counselor_notes (sensitive — counselors + admins only; members cannot read)
DROP POLICY IF EXISTS "counselor_notes_select_counselor" ON counselor_notes;
CREATE POLICY "counselor_notes_select_counselor" ON counselor_notes FOR SELECT USING (
  member_id IS NOT NULL AND is_counselor_for_member(member_id)
);
DROP POLICY IF EXISTS "counselor_notes_select_admin" ON counselor_notes;
CREATE POLICY "counselor_notes_select_admin" ON counselor_notes FOR SELECT USING (
  member_id IS NOT NULL AND is_admin_for_member_data(member_id)
);
DROP POLICY IF EXISTS "counselor_notes_modify_author" ON counselor_notes;
CREATE POLICY "counselor_notes_modify_author" ON counselor_notes FOR ALL USING (author_id = get_current_user_id()) WITH CHECK (author_id = get_current_user_id());
DROP POLICY IF EXISTS "counselor_notes_insert_counselor" ON counselor_notes;
CREATE POLICY "counselor_notes_insert_counselor" ON counselor_notes FOR INSERT WITH CHECK (
  author_id = get_current_user_id()
  AND (member_id IS NULL OR is_counselor_for_member(member_id) OR is_admin_for_member_data(member_id))
);

-- partner_referrals
DROP POLICY IF EXISTS "partner_referrals_select_member" ON partner_referrals;
CREATE POLICY "partner_referrals_select_member" ON partner_referrals FOR SELECT USING (member_id = get_current_user_id());
DROP POLICY IF EXISTS "partner_referrals_select_partner" ON partner_referrals;
CREATE POLICY "partner_referrals_select_partner" ON partner_referrals FOR SELECT USING (is_current_partner(partner_id));
DROP POLICY IF EXISTS "partner_referrals_select_admin" ON partner_referrals;
CREATE POLICY "partner_referrals_select_admin" ON partner_referrals FOR SELECT USING (is_admin_for_member_data(member_id));
DROP POLICY IF EXISTS "partner_referrals_modify_partner" ON partner_referrals;
CREATE POLICY "partner_referrals_modify_partner" ON partner_referrals FOR ALL USING (is_current_partner(partner_id)) WITH CHECK (is_current_partner(partner_id));

-- partner_outreach_logs
DROP POLICY IF EXISTS "partner_outreach_logs_select_partner" ON partner_outreach_logs;
CREATE POLICY "partner_outreach_logs_select_partner" ON partner_outreach_logs FOR SELECT USING (is_current_partner(partner_id));
DROP POLICY IF EXISTS "partner_outreach_logs_select_admin" ON partner_outreach_logs;
CREATE POLICY "partner_outreach_logs_select_admin" ON partner_outreach_logs FOR SELECT USING (is_admin_for_member_data(member_id));
DROP POLICY IF EXISTS "partner_outreach_logs_modify_partner" ON partner_outreach_logs;
CREATE POLICY "partner_outreach_logs_modify_partner" ON partner_outreach_logs FOR ALL USING (is_current_partner(partner_id)) WITH CHECK (is_current_partner(partner_id));

-- ============================================
-- SECTION 7: Messaging
-- ============================================

-- message_threads — visible to participants
DROP POLICY IF EXISTS "message_threads_select_participant" ON message_threads;
CREATE POLICY "message_threads_select_participant" ON message_threads FOR SELECT USING (
  member_id = get_current_user_id()
  OR counselor_user_id = get_current_user_id()
  OR staff_user_id = get_current_user_id()
  OR (employer_id IS NOT NULL AND is_current_employer(employer_id))
  OR (partner_id IS NOT NULL AND is_current_partner(partner_id))
  OR (member_id IS NOT NULL AND is_admin_for_member_data(member_id))
  OR is_current_super_admin()
);
DROP POLICY IF EXISTS "message_threads_update_participant" ON message_threads;
CREATE POLICY "message_threads_update_participant" ON message_threads FOR UPDATE USING (
  member_id = get_current_user_id()
  OR counselor_user_id = get_current_user_id()
  OR staff_user_id = get_current_user_id()
  OR (employer_id IS NOT NULL AND is_current_employer(employer_id))
  OR (partner_id IS NOT NULL AND is_current_partner(partner_id))
);

-- messages — inherit thread visibility
DROP POLICY IF EXISTS "messages_select_thread_participant" ON messages;
CREATE POLICY "messages_select_thread_participant" ON messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM message_threads t
    WHERE t.id = messages.thread_id
      AND (
        t.member_id = get_current_user_id()
        OR t.counselor_user_id = get_current_user_id()
        OR t.staff_user_id = get_current_user_id()
        OR (t.employer_id IS NOT NULL AND is_current_employer(t.employer_id))
        OR (t.partner_id IS NOT NULL AND is_current_partner(t.partner_id))
        OR (t.member_id IS NOT NULL AND is_admin_for_member_data(t.member_id))
        OR is_current_super_admin()
      )
  )
);
DROP POLICY IF EXISTS "messages_insert_author" ON messages;
CREATE POLICY "messages_insert_author" ON messages FOR INSERT WITH CHECK (
  author_id = get_current_user_id()
  AND EXISTS (
    SELECT 1 FROM message_threads t
    WHERE t.id = messages.thread_id
      AND (
        t.member_id = get_current_user_id()
        OR t.counselor_user_id = get_current_user_id()
        OR t.staff_user_id = get_current_user_id()
        OR (t.employer_id IS NOT NULL AND is_current_employer(t.employer_id))
        OR (t.partner_id IS NOT NULL AND is_current_partner(t.partner_id))
      )
  )
);

-- ============================================
-- SECTION 8: Job postings, applications, AI matches
-- ============================================

-- job_posting_applications
DROP POLICY IF EXISTS "job_posting_applications_select_student" ON job_posting_applications;
CREATE POLICY "job_posting_applications_select_student" ON job_posting_applications FOR SELECT USING (student_id = get_current_user_id());
DROP POLICY IF EXISTS "job_posting_applications_select_employer" ON job_posting_applications;
CREATE POLICY "job_posting_applications_select_employer" ON job_posting_applications FOR SELECT USING (
  EXISTS (SELECT 1 FROM jobs j WHERE j.id = job_posting_applications.job_id AND is_current_employer(j.employer_id))
);
DROP POLICY IF EXISTS "job_posting_applications_select_admin" ON job_posting_applications;
CREATE POLICY "job_posting_applications_select_admin" ON job_posting_applications FOR SELECT USING (is_admin_for_member_data(student_id));
DROP POLICY IF EXISTS "job_posting_applications_insert_student" ON job_posting_applications;
CREATE POLICY "job_posting_applications_insert_student" ON job_posting_applications FOR INSERT WITH CHECK (student_id = get_current_user_id());
DROP POLICY IF EXISTS "job_posting_applications_update_student" ON job_posting_applications;
CREATE POLICY "job_posting_applications_update_student" ON job_posting_applications FOR UPDATE USING (student_id = get_current_user_id());
DROP POLICY IF EXISTS "job_posting_applications_update_employer" ON job_posting_applications;
CREATE POLICY "job_posting_applications_update_employer" ON job_posting_applications FOR UPDATE USING (
  EXISTS (SELECT 1 FROM jobs j WHERE j.id = job_posting_applications.job_id AND is_current_employer(j.employer_id))
);

-- application_messages
DROP POLICY IF EXISTS "application_messages_select_participant" ON application_messages;
CREATE POLICY "application_messages_select_participant" ON application_messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM job_posting_applications a
    LEFT JOIN jobs j ON j.id = a.job_id
    WHERE a.id = application_messages.application_id
      AND (
        a.student_id = get_current_user_id()
        OR is_current_employer(j.employer_id)
        OR is_admin_for_member_data(a.student_id)
      )
  )
);
DROP POLICY IF EXISTS "application_messages_insert_participant" ON application_messages;
CREATE POLICY "application_messages_insert_participant" ON application_messages FOR INSERT WITH CHECK (
  author_id = get_current_user_id()
  AND EXISTS (
    SELECT 1 FROM job_posting_applications a
    LEFT JOIN jobs j ON j.id = a.job_id
    WHERE a.id = application_messages.application_id
      AND (a.student_id = get_current_user_id() OR is_current_employer(j.employer_id))
  )
);

-- ai_job_matches
DROP POLICY IF EXISTS "ai_job_matches_select_student" ON ai_job_matches;
CREATE POLICY "ai_job_matches_select_student" ON ai_job_matches FOR SELECT USING (student_id = get_current_user_id());
DROP POLICY IF EXISTS "ai_job_matches_select_employer" ON ai_job_matches;
CREATE POLICY "ai_job_matches_select_employer" ON ai_job_matches FOR SELECT USING (
  EXISTS (SELECT 1 FROM jobs j WHERE j.id = ai_job_matches.job_id AND is_current_employer(j.employer_id))
);
DROP POLICY IF EXISTS "ai_job_matches_select_admin" ON ai_job_matches;
CREATE POLICY "ai_job_matches_select_admin" ON ai_job_matches FOR SELECT USING (is_admin_for_member_data(student_id));
DROP POLICY IF EXISTS "ai_job_matches_update_student" ON ai_job_matches;
CREATE POLICY "ai_job_matches_update_student" ON ai_job_matches FOR UPDATE USING (student_id = get_current_user_id());

-- portal_workflow_events
DROP POLICY IF EXISTS "portal_workflow_events_select_employer" ON portal_workflow_events;
CREATE POLICY "portal_workflow_events_select_employer" ON portal_workflow_events FOR SELECT USING (
  employer_id IS NOT NULL AND is_current_employer(employer_id)
);
DROP POLICY IF EXISTS "portal_workflow_events_select_partner" ON portal_workflow_events;
CREATE POLICY "portal_workflow_events_select_partner" ON portal_workflow_events FOR SELECT USING (
  partner_id IS NOT NULL AND is_current_partner(partner_id)
);
DROP POLICY IF EXISTS "portal_workflow_events_select_admin" ON portal_workflow_events;
CREATE POLICY "portal_workflow_events_select_admin" ON portal_workflow_events FOR SELECT USING (is_current_admin());

-- mentor_sessions (recreate with org-aware roles)
DROP POLICY IF EXISTS "mentor_sessions_select_member" ON mentor_sessions;
CREATE POLICY "mentor_sessions_select_member" ON mentor_sessions FOR SELECT USING (member_id = get_current_user_id());
DROP POLICY IF EXISTS "mentor_sessions_select_mentor" ON mentor_sessions;
CREATE POLICY "mentor_sessions_select_mentor" ON mentor_sessions FOR SELECT USING (
  EXISTS (SELECT 1 FROM mentors m WHERE m.id = mentor_sessions.mentor_id AND m.user_id = get_current_user_id())
);
DROP POLICY IF EXISTS "mentor_sessions_select_admin" ON mentor_sessions;
CREATE POLICY "mentor_sessions_select_admin" ON mentor_sessions FOR SELECT USING (is_admin_for_member_data(member_id));

-- ============================================
-- SECTION 9: P1 — Business / Org-scoped tables
-- ============================================

-- employers
DROP POLICY IF EXISTS "employers_select_self" ON employers;
CREATE POLICY "employers_select_self" ON employers FOR SELECT USING (user_id = get_current_user_id());
DROP POLICY IF EXISTS "employers_select_org" ON employers;
CREATE POLICY "employers_select_org" ON employers FOR SELECT USING (can_access_org_row(organization_id) AND is_current_admin());
DROP POLICY IF EXISTS "employers_update_self" ON employers;
CREATE POLICY "employers_update_self" ON employers FOR UPDATE USING (user_id = get_current_user_id());
DROP POLICY IF EXISTS "employers_update_admin" ON employers;
CREATE POLICY "employers_update_admin" ON employers FOR UPDATE USING (can_access_org_row(organization_id) AND is_current_admin());

-- employer_hiring_intents
DROP POLICY IF EXISTS "employer_hiring_intents_select_employer" ON employer_hiring_intents;
CREATE POLICY "employer_hiring_intents_select_employer" ON employer_hiring_intents FOR SELECT USING (is_current_employer(employer_id));
DROP POLICY IF EXISTS "employer_hiring_intents_select_admin" ON employer_hiring_intents;
CREATE POLICY "employer_hiring_intents_select_admin" ON employer_hiring_intents FOR SELECT USING (is_current_admin());
DROP POLICY IF EXISTS "employer_hiring_intents_modify_employer" ON employer_hiring_intents;
CREATE POLICY "employer_hiring_intents_modify_employer" ON employer_hiring_intents FOR ALL USING (is_current_employer(employer_id)) WITH CHECK (is_current_employer(employer_id));

-- jobs (employer owns; org-scoped; published jobs readable by org members)
DROP POLICY IF EXISTS "jobs_select_employer" ON jobs;
CREATE POLICY "jobs_select_employer" ON jobs FOR SELECT USING (is_current_employer(employer_id));
DROP POLICY IF EXISTS "jobs_select_org_published" ON jobs;
CREATE POLICY "jobs_select_org_published" ON jobs FOR SELECT USING (
  can_access_org_row(organization_id) AND status::text IN ('open', 'approved', 'active', 'published')
);
DROP POLICY IF EXISTS "jobs_select_admin" ON jobs;
CREATE POLICY "jobs_select_admin" ON jobs FOR SELECT USING (can_access_org_row(organization_id) AND is_current_admin());
DROP POLICY IF EXISTS "jobs_modify_employer" ON jobs;
CREATE POLICY "jobs_modify_employer" ON jobs FOR ALL USING (is_current_employer(employer_id)) WITH CHECK (is_current_employer(employer_id));
DROP POLICY IF EXISTS "jobs_modify_admin" ON jobs;
CREATE POLICY "jobs_modify_admin" ON jobs FOR ALL USING (can_access_org_row(organization_id) AND is_current_admin()) WITH CHECK (can_access_org_row(organization_id) AND is_current_admin());

-- partners
DROP POLICY IF EXISTS "partners_select_member" ON partners;
CREATE POLICY "partners_select_member" ON partners FOR SELECT USING (is_current_partner(id));
DROP POLICY IF EXISTS "partners_select_admin" ON partners;
CREATE POLICY "partners_select_admin" ON partners FOR SELECT USING (can_access_org_row(organization_id) AND is_current_admin());
DROP POLICY IF EXISTS "partners_modify_admin" ON partners;
CREATE POLICY "partners_modify_admin" ON partners FOR ALL USING (can_access_org_row(organization_id) AND is_current_admin()) WITH CHECK (can_access_org_row(organization_id) AND is_current_admin());

-- partner_users
DROP POLICY IF EXISTS "partner_users_select_self" ON partner_users;
CREATE POLICY "partner_users_select_self" ON partner_users FOR SELECT USING (user_id = get_current_user_id());
DROP POLICY IF EXISTS "partner_users_select_partner_peer" ON partner_users;
CREATE POLICY "partner_users_select_partner_peer" ON partner_users FOR SELECT USING (is_current_partner(partner_id));
DROP POLICY IF EXISTS "partner_users_select_admin" ON partner_users;
CREATE POLICY "partner_users_select_admin" ON partner_users FOR SELECT USING (is_current_admin());
DROP POLICY IF EXISTS "partner_users_modify_admin" ON partner_users;
CREATE POLICY "partner_users_modify_admin" ON partner_users FOR ALL USING (is_current_admin()) WITH CHECK (is_current_admin());

-- counselors
DROP POLICY IF EXISTS "counselors_select_self" ON counselors;
CREATE POLICY "counselors_select_self" ON counselors FOR SELECT USING (user_id = get_current_user_id());
DROP POLICY IF EXISTS "counselors_select_assigned_member" ON counselors;
CREATE POLICY "counselors_select_assigned_member" ON counselors FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM counselor_assignments ca
    WHERE ca.counselor_id = counselors.id
      AND ca.member_id = get_current_user_id()
      AND ca.active = true
  )
);
DROP POLICY IF EXISTS "counselors_select_admin" ON counselors;
CREATE POLICY "counselors_select_admin" ON counselors FOR SELECT USING (is_current_admin());
DROP POLICY IF EXISTS "counselors_modify_admin" ON counselors;
CREATE POLICY "counselors_modify_admin" ON counselors FOR ALL USING (is_current_admin()) WITH CHECK (is_current_admin());

-- subgroups
DROP POLICY IF EXISTS "subgroups_select_leader" ON subgroups;
CREATE POLICY "subgroups_select_leader" ON subgroups FOR SELECT USING (leader_id = get_current_user_id() OR created_by = get_current_user_id());
DROP POLICY IF EXISTS "subgroups_select_partner" ON subgroups;
CREATE POLICY "subgroups_select_partner" ON subgroups FOR SELECT USING (partner_id IS NOT NULL AND is_current_partner(partner_id));
DROP POLICY IF EXISTS "subgroups_select_admin" ON subgroups;
CREATE POLICY "subgroups_select_admin" ON subgroups FOR SELECT USING (is_current_admin());

-- invitations
DROP POLICY IF EXISTS "invitations_select_inviter" ON invitations;
CREATE POLICY "invitations_select_inviter" ON invitations FOR SELECT USING (invited_by = get_current_user_id());
DROP POLICY IF EXISTS "invitations_select_partner" ON invitations;
CREATE POLICY "invitations_select_partner" ON invitations FOR SELECT USING (partner_id IS NOT NULL AND is_current_partner(partner_id));
DROP POLICY IF EXISTS "invitations_select_admin" ON invitations;
CREATE POLICY "invitations_select_admin" ON invitations FOR SELECT USING (is_current_admin());
DROP POLICY IF EXISTS "invitations_modify_inviter" ON invitations;
CREATE POLICY "invitations_modify_inviter" ON invitations FOR ALL USING (invited_by = get_current_user_id()) WITH CHECK (invited_by = get_current_user_id());

-- ============================================
-- SECTION 10: P2 — System tables
-- ============================================

-- organizations: super_admin sees all, org members see own org
DROP POLICY IF EXISTS "organizations_select_own" ON organizations;
CREATE POLICY "organizations_select_own" ON organizations FOR SELECT USING (
  is_current_super_admin() OR id = get_current_org_id()
);
DROP POLICY IF EXISTS "organizations_modify_super_admin" ON organizations;
CREATE POLICY "organizations_modify_super_admin" ON organizations FOR ALL USING (is_current_super_admin()) WITH CHECK (is_current_super_admin());
DROP POLICY IF EXISTS "organizations_update_admin" ON organizations;
CREATE POLICY "organizations_update_admin" ON organizations FOR UPDATE USING (is_current_admin() AND id = get_current_org_id());

-- user_roles: user sees own; admins manage in org
DROP POLICY IF EXISTS "user_roles_select_own" ON user_roles;
CREATE POLICY "user_roles_select_own" ON user_roles FOR SELECT USING (user_id = get_current_user_id());
DROP POLICY IF EXISTS "user_roles_select_admin" ON user_roles;
CREATE POLICY "user_roles_select_admin" ON user_roles FOR SELECT USING (is_admin_for_member_data(user_id));
DROP POLICY IF EXISTS "user_roles_modify_admin" ON user_roles;
CREATE POLICY "user_roles_modify_admin" ON user_roles FOR ALL USING (is_admin_for_member_data(user_id)) WITH CHECK (is_admin_for_member_data(user_id));

-- resources: visibility rule already enforced in app; readable by any authenticated user
DROP POLICY IF EXISTS "resources_select_all" ON resources;
CREATE POLICY "resources_select_all" ON resources FOR SELECT USING (get_current_user_id() IS NOT NULL);
DROP POLICY IF EXISTS "resources_modify_admin" ON resources;
CREATE POLICY "resources_modify_admin" ON resources FOR ALL USING (is_current_admin()) WITH CHECK (is_current_admin());

-- audit_logs: actor reads own; admins read all in their org (via actor.user.org); inserts unrestricted (service role only)
DROP POLICY IF EXISTS "audit_logs_select_actor" ON audit_logs;
CREATE POLICY "audit_logs_select_actor" ON audit_logs FOR SELECT USING (actor_user_id = get_current_user_id());
DROP POLICY IF EXISTS "audit_logs_select_admin" ON audit_logs;
CREATE POLICY "audit_logs_select_admin" ON audit_logs FOR SELECT USING (
  is_current_super_admin()
  OR (is_current_admin() AND actor_user_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM users u WHERE u.id = audit_logs.actor_user_id AND u.organization_id = get_current_org_id()
  ))
);

-- ============================================
-- SECTION 11: FORCE ROW LEVEL SECURITY on P0 tables
-- Prevents table-owner bypass; only super_admin GUC should be used for service writes.
-- ============================================

ALTER TABLE users FORCE ROW LEVEL SECURITY;
ALTER TABLE profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE applications FORCE ROW LEVEL SECURITY;
ALTER TABLE job_applications FORCE ROW LEVEL SECURITY;
ALTER TABLE readiness_checklist FORCE ROW LEVEL SECURITY;
ALTER TABLE benefit_requests FORCE ROW LEVEL SECURITY;
ALTER TABLE program_change_requests FORCE ROW LEVEL SECURITY;
ALTER TABLE learning_progress FORCE ROW LEVEL SECURITY;
ALTER TABLE goals FORCE ROW LEVEL SECURITY;
ALTER TABLE resource_progress FORCE ROW LEVEL SECURITY;
ALTER TABLE member_events FORCE ROW LEVEL SECURITY;
ALTER TABLE weekly_recaps FORCE ROW LEVEL SECURITY;
ALTER TABLE pathway_step_progress FORCE ROW LEVEL SECURITY;
ALTER TABLE training_access_requests FORCE ROW LEVEL SECURITY;
ALTER TABLE ai_tool_results FORCE ROW LEVEL SECURITY;
ALTER TABLE application_ai_feedback FORCE ROW LEVEL SECURITY;
ALTER TABLE user_certifications FORCE ROW LEVEL SECURITY;
ALTER TABLE course_progress FORCE ROW LEVEL SECURITY;
ALTER TABLE member_program_progress FORCE ROW LEVEL SECURITY;
ALTER TABLE pre_screening_responses FORCE ROW LEVEL SECURITY;
ALTER TABLE pre_screening_drafts FORCE ROW LEVEL SECURITY;
ALTER TABLE counselor_assignments FORCE ROW LEVEL SECURITY;
ALTER TABLE counselor_notes FORCE ROW LEVEL SECURITY;
ALTER TABLE placement_records FORCE ROW LEVEL SECURITY;
ALTER TABLE placed_outcomes FORCE ROW LEVEL SECURITY;
ALTER TABLE partner_referrals FORCE ROW LEVEL SECURITY;
ALTER TABLE partner_outreach_logs FORCE ROW LEVEL SECURITY;
ALTER TABLE message_threads FORCE ROW LEVEL SECURITY;
ALTER TABLE messages FORCE ROW LEVEL SECURITY;
ALTER TABLE job_posting_applications FORCE ROW LEVEL SECURITY;
ALTER TABLE application_messages FORCE ROW LEVEL SECURITY;
ALTER TABLE portal_workflow_events FORCE ROW LEVEL SECURITY;
ALTER TABLE ai_job_matches FORCE ROW LEVEL SECURITY;
ALTER TABLE member_next_best_actions FORCE ROW LEVEL SECURITY;
ALTER TABLE member_points FORCE ROW LEVEL SECURITY;
ALTER TABLE points_transactions FORCE ROW LEVEL SECURITY;
ALTER TABLE at_risk_alerts FORCE ROW LEVEL SECURITY;
ALTER TABLE placement_surveys FORCE ROW LEVEL SECURITY;
ALTER TABLE testimonials FORCE ROW LEVEL SECURITY;
ALTER TABLE coursera_course_progress FORCE ROW LEVEL SECURITY;
ALTER TABLE coursera_badge_progress FORCE ROW LEVEL SECURITY;
ALTER TABLE coursera_skillset_progress FORCE ROW LEVEL SECURITY;
ALTER TABLE coursera_identity_mappings FORCE ROW LEVEL SECURITY;
ALTER TABLE xapi_statements FORCE ROW LEVEL SECURITY;
ALTER TABLE mentor_sessions FORCE ROW LEVEL SECURITY;

-- ============================================
-- End of migration
-- ============================================

