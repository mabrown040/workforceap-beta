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

