-- ─── RLS prep: write policies on member-owned tables + missing ENABLE ──────
--
-- Two issues Codex caught in the original RLS migration
-- (20260513040000_add_rls_policies) that would activate the moment
-- FORCE ROW LEVEL SECURITY is re-enabled on the affected tables:
--
-- (1) `goals` declared only SELECT policies. Members hit
--     `POST /api/member/goals` which does `prisma.goal.create(...)`,
--     and that would fail with an RLS-violation error under a
--     non-bypass connection role.
--
-- (2) `mentor_sessions` had FORCE ROW LEVEL SECURITY but NO
--     `ENABLE ROW LEVEL SECURITY`. In Postgres, FORCE without ENABLE
--     leaves the policies sitting dormant: the table-owner sees
--     everything, non-owners are blocked by ownership rather than
--     policy. Defense-in-depth broken.
--
-- The earlier follow-up migration 20260514000000 deferred FORCE on
-- every table specifically because the GUC middleware can't yet
-- propagate session settings across the Prisma connection pool. So
-- these issues are latent today. This migration prepares the policies
-- for the eventual re-enable so we don't ship round-2 bugs alongside
-- the round-2 re-enable.

-- ─── (1) goals — owner write policies ───────────────────────────────────────
--
-- Pattern: owner-only INSERT/UPDATE/DELETE. Admins inherit via the
-- existing `is_admin_for_member_data` helper. Counselors get UPDATE
-- (e.g. counselor-set goals on behalf of an assigned member) but NOT
-- DELETE (intentional: counselors shouldn't be able to delete a
-- member's progress trail).

DROP POLICY IF EXISTS "goals_insert_own" ON goals;
CREATE POLICY "goals_insert_own" ON goals
  FOR INSERT WITH CHECK (user_id = get_current_user_id());

DROP POLICY IF EXISTS "goals_insert_admin" ON goals;
CREATE POLICY "goals_insert_admin" ON goals
  FOR INSERT WITH CHECK (is_admin_for_member_data(user_id));

DROP POLICY IF EXISTS "goals_insert_counselor" ON goals;
CREATE POLICY "goals_insert_counselor" ON goals
  FOR INSERT WITH CHECK (is_counselor_for_member(user_id));

DROP POLICY IF EXISTS "goals_update_own" ON goals;
CREATE POLICY "goals_update_own" ON goals
  FOR UPDATE USING (user_id = get_current_user_id())
              WITH CHECK (user_id = get_current_user_id());

DROP POLICY IF EXISTS "goals_update_admin" ON goals;
CREATE POLICY "goals_update_admin" ON goals
  FOR UPDATE USING (is_admin_for_member_data(user_id))
              WITH CHECK (is_admin_for_member_data(user_id));

DROP POLICY IF EXISTS "goals_update_counselor" ON goals;
CREATE POLICY "goals_update_counselor" ON goals
  FOR UPDATE USING (is_counselor_for_member(user_id))
              WITH CHECK (is_counselor_for_member(user_id));

DROP POLICY IF EXISTS "goals_delete_own" ON goals;
CREATE POLICY "goals_delete_own" ON goals
  FOR DELETE USING (user_id = get_current_user_id());

DROP POLICY IF EXISTS "goals_delete_admin" ON goals;
CREATE POLICY "goals_delete_admin" ON goals
  FOR DELETE USING (is_admin_for_member_data(user_id));

-- ─── (2) mentor_sessions — actually ENABLE row level security ──────────────
--
-- The original migration set FORCE on this table but never ENABLE.
-- Pair them now so the (already-created) SELECT/UPDATE/INSERT/DELETE
-- policies are evaluated. Idempotent — Postgres treats repeat ENABLEs
-- as a no-op.

ALTER TABLE mentor_sessions ENABLE ROW LEVEL SECURITY;

-- ─── Rollback (manual) ──────────────────────────────────────────────────────
-- DROP POLICY IF EXISTS "goals_insert_own"       ON goals;
-- DROP POLICY IF EXISTS "goals_insert_admin"     ON goals;
-- DROP POLICY IF EXISTS "goals_insert_counselor" ON goals;
-- DROP POLICY IF EXISTS "goals_update_own"       ON goals;
-- DROP POLICY IF EXISTS "goals_update_admin"     ON goals;
-- DROP POLICY IF EXISTS "goals_update_counselor" ON goals;
-- DROP POLICY IF EXISTS "goals_delete_own"       ON goals;
-- DROP POLICY IF EXISTS "goals_delete_admin"     ON goals;
-- ALTER TABLE mentor_sessions DISABLE ROW LEVEL SECURITY;
