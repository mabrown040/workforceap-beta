-- WorkforceAP Members Portal - Row Level Security (RLS) Policies
-- Run this in Supabase SQL Editor after migrations are applied.
-- These policies add defense-in-depth when DB is accessed with role context.

-- Enable RLS on all member data tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE placement_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE counselor_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentors ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentor_specialties ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentor_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_next_best_actions ENABLE ROW LEVEL SECURITY;

-- Roles table: readable by authenticated users (for role checks)
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

-- Helper: get current user id from JWT (when using Supabase Auth context)
-- CREATE OR REPLACE FUNCTION auth.user_id() RETURNS uuid AS $$
--   SELECT COALESCE(
--     (current_setting('request.jwt.claims', true)::json->>'sub')::uuid,
--     NULL
--   );
-- $$ LANGUAGE sql STABLE;

-- Users: members can read/update their own row
CREATE POLICY "users_select_own" ON users
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "users_update_own" ON users
  FOR UPDATE USING (id = auth.uid());

-- Profiles: members can read/update their own
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND role = (
      SELECT p.role
      FROM profiles AS p
      WHERE p.id = profiles.id
    )
  );

-- Applications: members can read their own
CREATE POLICY "applications_select_own" ON applications
  FOR SELECT USING (user_id = auth.uid());

-- Applications: members cannot update (status changes are admin-only via API)
-- No UPDATE policy for members.

-- Job applications: members can CRUD their own entries
CREATE POLICY "job_applications_select_own" ON job_applications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "job_applications_insert_own" ON job_applications
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "job_applications_update_own" ON job_applications
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "job_applications_delete_own" ON job_applications
  FOR DELETE USING (user_id = auth.uid());

-- User_roles: members can read their own roles
CREATE POLICY "user_roles_select_own" ON user_roles
  FOR SELECT USING (user_id = auth.uid());

-- Resources: members can read where visibility allows
-- (Simplified: allow read for member-visible resources)
CREATE POLICY "resources_select_member" ON resources
  FOR SELECT USING (
    visibility_rule IS NULL
    OR visibility_rule = 'member'
    OR visibility_rule = 'admin'
    OR visibility_rule = 'case_manager'
  );

-- Audit_logs: append-only. No policy for INSERT = deny for anon/authenticated.
-- Backend (postgres/service_role) bypasses RLS and can insert.

-- Roles: readable by all authenticated
CREATE POLICY "roles_select_all" ON roles
  FOR SELECT USING (auth.role() = 'authenticated');

-- Admin/case_manager policies: require role check
-- These use a helper that checks user_roles. In production you might use
-- a custom claim or a DB function that checks the roles table.
-- For now, app-level checks in API routes are the primary enforcement.
-- RLS adds protection if someone gains direct DB access with a user JWT.

-- Service role bypass: Supabase service role bypasses RLS by default.
-- Ensure app uses service role only for admin operations and never exposes it.

-- --- Realtime: member ↔ counselor chat ---
-- After migration creates message_threads and messages, enable postgres_changes:
-- ALTER PUBLICATION supabase_realtime ADD TABLE message_threads;
-- ALTER PUBLICATION supabase_realtime ADD TABLE messages;
-- (Migration sets REPLICA IDENTITY FULL on both tables for complete payloads.)
-- Optional RLS for direct client access; app primarily uses API + service role for writes.

-- Mentor/member enrollment tables
DROP POLICY IF EXISTS "mentors_select_active" ON mentors;
CREATE POLICY "mentors_select_active" ON mentors
  FOR SELECT USING (auth.role() = 'authenticated' AND is_active = true);

DROP POLICY IF EXISTS "mentors_select_own" ON mentors;
CREATE POLICY "mentors_select_own" ON mentors
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "mentors_update_own" ON mentors;
CREATE POLICY "mentors_update_own" ON mentors
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "mentor_specialties_select_visible" ON mentor_specialties;
CREATE POLICY "mentor_specialties_select_visible" ON mentor_specialties
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1
      FROM mentors m
      WHERE m.id = mentor_specialties.mentor_id
        AND (m.is_active = true OR m.user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "mentor_specialties_insert_own" ON mentor_specialties;
CREATE POLICY "mentor_specialties_insert_own" ON mentor_specialties
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM mentors m
      WHERE m.id = mentor_specialties.mentor_id
        AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "mentor_specialties_update_own" ON mentor_specialties;
CREATE POLICY "mentor_specialties_update_own" ON mentor_specialties
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM mentors m
      WHERE m.id = mentor_specialties.mentor_id
        AND m.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM mentors m
      WHERE m.id = mentor_specialties.mentor_id
        AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "mentor_specialties_delete_own" ON mentor_specialties;
CREATE POLICY "mentor_specialties_delete_own" ON mentor_specialties
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM mentors m
      WHERE m.id = mentor_specialties.mentor_id
        AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "mentor_sessions_select_participant" ON mentor_sessions;
CREATE POLICY "mentor_sessions_select_participant" ON mentor_sessions
  FOR SELECT USING (
    member_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM mentors m
      WHERE m.id = mentor_sessions.mentor_id
        AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "mentor_sessions_insert_participant" ON mentor_sessions;
CREATE POLICY "mentor_sessions_insert_participant" ON mentor_sessions
  FOR INSERT WITH CHECK (
    member_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM mentors m
      WHERE m.id = mentor_sessions.mentor_id
        AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "mentor_sessions_update_participant" ON mentor_sessions;
CREATE POLICY "mentor_sessions_update_participant" ON mentor_sessions
  FOR UPDATE USING (
    member_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM mentors m
      WHERE m.id = mentor_sessions.mentor_id
        AND m.user_id = auth.uid()
    )
  )
  WITH CHECK (
    member_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM mentors m
      WHERE m.id = mentor_sessions.mentor_id
        AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "mentor_sessions_delete_participant" ON mentor_sessions;
CREATE POLICY "mentor_sessions_delete_participant" ON mentor_sessions
  FOR DELETE USING (
    member_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM mentors m
      WHERE m.id = mentor_sessions.mentor_id
        AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "member_next_best_actions_select_own" ON member_next_best_actions;
CREATE POLICY "member_next_best_actions_select_own" ON member_next_best_actions
  FOR SELECT USING (member_id = auth.uid());

DROP POLICY IF EXISTS "member_next_best_actions_insert_own" ON member_next_best_actions;
CREATE POLICY "member_next_best_actions_insert_own" ON member_next_best_actions
  FOR INSERT WITH CHECK (member_id = auth.uid());

DROP POLICY IF EXISTS "member_next_best_actions_update_own" ON member_next_best_actions;
CREATE POLICY "member_next_best_actions_update_own" ON member_next_best_actions
  FOR UPDATE USING (member_id = auth.uid())
  WITH CHECK (member_id = auth.uid());

DROP POLICY IF EXISTS "member_next_best_actions_delete_own" ON member_next_best_actions;
CREATE POLICY "member_next_best_actions_delete_own" ON member_next_best_actions
  FOR DELETE USING (member_id = auth.uid());

DROP POLICY IF EXISTS "course_enrollments_select_own" ON course_enrollments;
CREATE POLICY "course_enrollments_select_own" ON course_enrollments
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "course_enrollments_update_own" ON course_enrollments;
CREATE POLICY "course_enrollments_update_own" ON course_enrollments
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
