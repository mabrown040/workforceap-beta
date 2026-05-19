-- R2 — AI coach memory: one rolling summary row per member for voice/text coaches.

CREATE TABLE IF NOT EXISTS "coach_memories" (
    "user_id" TEXT NOT NULL,
    "summary" TEXT NOT NULL DEFAULT '',
    "last_topic" TEXT,
    "last_action" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coach_memories_pkey" PRIMARY KEY ("user_id"),
    CONSTRAINT "coach_memories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

ALTER TABLE coach_memories ENABLE ROW LEVEL SECURITY;

-- ─── SELECT ────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "coach_memories_select_own" ON coach_memories;
CREATE POLICY "coach_memories_select_own" ON coach_memories
  FOR SELECT USING (user_id = get_current_user_id());

DROP POLICY IF EXISTS "coach_memories_select_admin" ON coach_memories;
CREATE POLICY "coach_memories_select_admin" ON coach_memories
  FOR SELECT USING (is_admin_for_member_data(user_id));

DROP POLICY IF EXISTS "coach_memories_select_counselor" ON coach_memories;
CREATE POLICY "coach_memories_select_counselor" ON coach_memories
  FOR SELECT USING (is_counselor_for_member(user_id));

DROP POLICY IF EXISTS "coach_memories_select_system" ON coach_memories;
CREATE POLICY "coach_memories_select_system" ON coach_memories
  FOR SELECT USING (current_setting('app.current_role', true) = 'system');

-- ─── INSERT ────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "coach_memories_insert_own" ON coach_memories;
CREATE POLICY "coach_memories_insert_own" ON coach_memories
  FOR INSERT WITH CHECK (user_id = get_current_user_id());

DROP POLICY IF EXISTS "coach_memories_insert_admin" ON coach_memories;
CREATE POLICY "coach_memories_insert_admin" ON coach_memories
  FOR INSERT WITH CHECK (is_admin_for_member_data(user_id));

DROP POLICY IF EXISTS "coach_memories_insert_system" ON coach_memories;
CREATE POLICY "coach_memories_insert_system" ON coach_memories
  FOR INSERT WITH CHECK (current_setting('app.current_role', true) = 'system');

-- ─── UPDATE ────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "coach_memories_update_own" ON coach_memories;
CREATE POLICY "coach_memories_update_own" ON coach_memories
  FOR UPDATE USING (user_id = get_current_user_id())
              WITH CHECK (user_id = get_current_user_id());

DROP POLICY IF EXISTS "coach_memories_update_admin" ON coach_memories;
CREATE POLICY "coach_memories_update_admin" ON coach_memories
  FOR UPDATE USING (is_admin_for_member_data(user_id))
              WITH CHECK (is_admin_for_member_data(user_id));

DROP POLICY IF EXISTS "coach_memories_update_system" ON coach_memories;
CREATE POLICY "coach_memories_update_system" ON coach_memories
  FOR UPDATE USING (current_setting('app.current_role', true) = 'system')
              WITH CHECK (current_setting('app.current_role', true) = 'system');

-- ─── DELETE (admin only) ───────────────────────────────────────────────────

DROP POLICY IF EXISTS "coach_memories_delete_admin" ON coach_memories;
CREATE POLICY "coach_memories_delete_admin" ON coach_memories
  FOR DELETE USING (is_admin_for_member_data(user_id));
