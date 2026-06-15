-- Sprint 2 compliance — P0: xapi_statements RLS policies using organization_id
--
-- Replaces the actor_email -> users.email heuristic with direct organization_id
-- scoping. This is required for FORCE RLS safety: the old heuristic allowed
-- cross-tenant reads when two users in different orgs happened to share an email.
--
-- Must run AFTER 20260615040346_xapi_statements_org_not_null (organization_id
-- is NOT NULL and backfilled).

-- Disable FORCE RLS temporarily so we can alter policies
ALTER TABLE xapi_statements NO FORCE ROW LEVEL SECURITY;

-- Drop old heuristic policies
DROP POLICY IF EXISTS "xapi_statements_select_own" ON xapi_statements;
DROP POLICY IF EXISTS "xapi_statements_select_admin" ON xapi_statements;

-- New policy: members see only statements in their organization
CREATE POLICY "xapi_statements_select_own" ON xapi_statements FOR SELECT USING (
  organization_id = (
    SELECT organization_id FROM users WHERE id = get_current_user_id() LIMIT 1
  )
);

-- New policy: admins see statements in orgs they administer
CREATE POLICY "xapi_statements_select_admin" ON xapi_statements FOR SELECT USING (
  organization_id IN (
    SELECT organization_id FROM users WHERE is_admin_for_member_data(id)
  )
);

-- Re-enable FORCE RLS
ALTER TABLE xapi_statements FORCE ROW LEVEL SECURITY;
