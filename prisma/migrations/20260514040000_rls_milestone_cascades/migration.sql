-- Codex P2 r3239... — milestone_cascades has no RLS policies
--
-- The 20260513040000_add_rls_policies migration applied policies to every
-- member-owned table that existed at the time, but milestone_cascades
-- (introduced by migration 20260513030000_add_milestone_cascade_model in
-- this same branch) was added AFTER the RLS migration ran, so its
-- protections were never set up. The table stores learner ids plus
-- AI-drafted counselor briefs/actions — exactly the kind of data the RLS
-- backstop is meant to protect against tenant-bypass connection roles.
--
-- Mirrors the pattern used for the other member-owned tables (goals,
-- placement_surveys, etc.):
--   - SELECT: own / admin / counselor
--   - INSERT/UPDATE/DELETE: admin (counselors don't write here; the
--     drafting cron uses the system role we authorized in 20260514000000)
--   - The cascade detection path runs from completeMemberCourse() which
--     is invoked by the xAPI webhook with the system GUC context too,
--     so the system role on writes covers both the cron and the
--     detection-on-completion path.
--
-- DEFERRED: like the other tables in 20260514000000_defer_rls_force_authorize_system,
-- we ENABLE ROW LEVEL SECURITY here but do NOT FORCE it. FORCE is held
-- until the GUC middleware can propagate session settings across the
-- Prisma connection pool (see the long-comment in lib/db/prisma.ts).

ALTER TABLE milestone_cascades ENABLE ROW LEVEL SECURITY;

-- ─── SELECT ────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "milestone_cascades_select_own" ON milestone_cascades;
CREATE POLICY "milestone_cascades_select_own" ON milestone_cascades
  FOR SELECT USING (user_id = get_current_user_id());

DROP POLICY IF EXISTS "milestone_cascades_select_admin" ON milestone_cascades;
CREATE POLICY "milestone_cascades_select_admin" ON milestone_cascades
  FOR SELECT USING (is_admin_for_member_data(user_id));

DROP POLICY IF EXISTS "milestone_cascades_select_counselor" ON milestone_cascades;
CREATE POLICY "milestone_cascades_select_counselor" ON milestone_cascades
  FOR SELECT USING (is_counselor_for_member(user_id));

DROP POLICY IF EXISTS "milestone_cascades_select_system" ON milestone_cascades;
CREATE POLICY "milestone_cascades_select_system" ON milestone_cascades
  FOR SELECT USING (current_setting('app.current_role', true) = 'system');

-- ─── INSERT (admin + system) ────────────────────────────────────────────────

DROP POLICY IF EXISTS "milestone_cascades_insert_admin" ON milestone_cascades;
CREATE POLICY "milestone_cascades_insert_admin" ON milestone_cascades
  FOR INSERT WITH CHECK (is_admin_for_member_data(user_id));

DROP POLICY IF EXISTS "milestone_cascades_insert_system" ON milestone_cascades;
CREATE POLICY "milestone_cascades_insert_system" ON milestone_cascades
  FOR INSERT WITH CHECK (current_setting('app.current_role', true) = 'system');

-- ─── UPDATE (admin + system) ────────────────────────────────────────────────

DROP POLICY IF EXISTS "milestone_cascades_update_admin" ON milestone_cascades;
CREATE POLICY "milestone_cascades_update_admin" ON milestone_cascades
  FOR UPDATE USING (is_admin_for_member_data(user_id))
              WITH CHECK (is_admin_for_member_data(user_id));

DROP POLICY IF EXISTS "milestone_cascades_update_system" ON milestone_cascades;
CREATE POLICY "milestone_cascades_update_system" ON milestone_cascades
  FOR UPDATE USING (current_setting('app.current_role', true) = 'system')
              WITH CHECK (current_setting('app.current_role', true) = 'system');

-- ─── DELETE (admin only) ───────────────────────────────────────────────────

DROP POLICY IF EXISTS "milestone_cascades_delete_admin" ON milestone_cascades;
CREATE POLICY "milestone_cascades_delete_admin" ON milestone_cascades
  FOR DELETE USING (is_admin_for_member_data(user_id));

-- ─── Rollback (manual) ─────────────────────────────────────────────────────
-- DROP POLICY IF EXISTS "milestone_cascades_select_own"      ON milestone_cascades;
-- DROP POLICY IF EXISTS "milestone_cascades_select_admin"    ON milestone_cascades;
-- DROP POLICY IF EXISTS "milestone_cascades_select_counselor"ON milestone_cascades;
-- DROP POLICY IF EXISTS "milestone_cascades_select_system"   ON milestone_cascades;
-- DROP POLICY IF EXISTS "milestone_cascades_insert_admin"    ON milestone_cascades;
-- DROP POLICY IF EXISTS "milestone_cascades_insert_system"   ON milestone_cascades;
-- DROP POLICY IF EXISTS "milestone_cascades_update_admin"    ON milestone_cascades;
-- DROP POLICY IF EXISTS "milestone_cascades_update_system"   ON milestone_cascades;
-- DROP POLICY IF EXISTS "milestone_cascades_delete_admin"    ON milestone_cascades;
-- ALTER TABLE milestone_cascades DISABLE ROW LEVEL SECURITY;
