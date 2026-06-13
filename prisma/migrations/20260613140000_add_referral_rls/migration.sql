-- Row Level Security for the member referral tables added in
-- 20260613060000_add_member_referrals. Kept as a separate migration so the
-- table-creation migration stays immutable after merge.
--
-- Mirrors the member-owned-table pattern (goals, placement_surveys, etc.):
-- own / admin / system access. As in 20260514000000_defer_rls_force_authorize_system,
-- we ENABLE but do NOT FORCE — FORCE is held until GUC middleware propagates session
-- settings across the Prisma connection pool (see lib/db/prisma.ts).
--
-- The reward path is cross-user (reads the referrer's code, writes the referrer's
-- points) and runs under the system role via withSystemGuc(), so the *_system
-- policies cover it. Members mint + read their own rows in their own user context.

ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "referral_codes_select_own" ON referral_codes;
CREATE POLICY "referral_codes_select_own" ON referral_codes
  FOR SELECT USING (user_id = get_current_user_id());

DROP POLICY IF EXISTS "referral_codes_select_admin" ON referral_codes;
CREATE POLICY "referral_codes_select_admin" ON referral_codes
  FOR SELECT USING (is_admin_for_member_data(user_id));

DROP POLICY IF EXISTS "referral_codes_select_system" ON referral_codes;
CREATE POLICY "referral_codes_select_system" ON referral_codes
  FOR SELECT USING (current_setting('app.current_role', true) = 'system');

DROP POLICY IF EXISTS "referral_codes_insert_own" ON referral_codes;
CREATE POLICY "referral_codes_insert_own" ON referral_codes
  FOR INSERT WITH CHECK (user_id = get_current_user_id());

DROP POLICY IF EXISTS "referral_codes_insert_system" ON referral_codes;
CREATE POLICY "referral_codes_insert_system" ON referral_codes
  FOR INSERT WITH CHECK (current_setting('app.current_role', true) = 'system');

DROP POLICY IF EXISTS "referral_codes_modify_admin" ON referral_codes;
CREATE POLICY "referral_codes_modify_admin" ON referral_codes
  FOR ALL USING (is_admin_for_member_data(user_id)) WITH CHECK (is_admin_for_member_data(user_id));

ALTER TABLE referral_conversions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "referral_conversions_select_referrer" ON referral_conversions;
CREATE POLICY "referral_conversions_select_referrer" ON referral_conversions
  FOR SELECT USING (referrer_user_id = get_current_user_id());

DROP POLICY IF EXISTS "referral_conversions_select_referee" ON referral_conversions;
CREATE POLICY "referral_conversions_select_referee" ON referral_conversions
  FOR SELECT USING (referee_user_id = get_current_user_id());

DROP POLICY IF EXISTS "referral_conversions_select_admin" ON referral_conversions;
CREATE POLICY "referral_conversions_select_admin" ON referral_conversions
  FOR SELECT USING (is_admin_for_member_data(referee_user_id));

DROP POLICY IF EXISTS "referral_conversions_select_system" ON referral_conversions;
CREATE POLICY "referral_conversions_select_system" ON referral_conversions
  FOR SELECT USING (current_setting('app.current_role', true) = 'system');

-- Writes happen only on the system reward path.
DROP POLICY IF EXISTS "referral_conversions_write_system" ON referral_conversions;
CREATE POLICY "referral_conversions_write_system" ON referral_conversions
  FOR ALL USING (current_setting('app.current_role', true) = 'system')
  WITH CHECK (current_setting('app.current_role', true) = 'system');

DROP POLICY IF EXISTS "referral_conversions_modify_admin" ON referral_conversions;
CREATE POLICY "referral_conversions_modify_admin" ON referral_conversions
  FOR ALL USING (is_admin_for_member_data(referee_user_id))
  WITH CHECK (is_admin_for_member_data(referee_user_id));
