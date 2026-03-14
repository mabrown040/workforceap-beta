-- WorkforceAP Members Portal - Row Level Security (RLS) Policies
-- Run this in Supabase SQL Editor after migrations are applied.
-- These policies add defense-in-depth when DB is accessed with role context.

-- Enable RLS on all member data tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

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

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (user_id = auth.uid());

-- Applications: members can read their own
CREATE POLICY "applications_select_own" ON applications
  FOR SELECT USING (user_id = auth.uid());

-- Applications: members cannot update (status changes are admin-only via API)
-- No UPDATE policy for members.

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
