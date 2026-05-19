-- xAPI-compatible admin audit events (org-scoped, immutable trail)

CREATE TABLE "audit_events" (
    "id" TEXT NOT NULL,
    "actor_user_id" TEXT NOT NULL,
    "actor_role" TEXT NOT NULL,
    "verb" TEXT NOT NULL,
    "object_type" TEXT NOT NULL,
    "object_id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "statement_json" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" TEXT,
    "ua" TEXT,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "audit_events_actor_user_id_idx" ON "audit_events"("actor_user_id");
CREATE INDEX "audit_events_org_id_created_at_idx" ON "audit_events"("org_id", "created_at");
CREATE INDEX "audit_events_object_type_object_id_idx" ON "audit_events"("object_type", "object_id");
CREATE INDEX "audit_events_verb_idx" ON "audit_events"("verb");
CREATE INDEX "audit_events_created_at_idx" ON "audit_events"("created_at");

ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RLS: org-scoped reads; admins insert for their org; system role for cron/backfill
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_events_select_org" ON audit_events;
CREATE POLICY "audit_events_select_org" ON audit_events
  FOR SELECT USING (can_access_org_row(org_id));

DROP POLICY IF EXISTS "audit_events_insert_admin" ON audit_events;
CREATE POLICY "audit_events_insert_admin" ON audit_events
  FOR INSERT WITH CHECK (
    is_current_admin()
    AND actor_user_id = get_current_user_id()
    AND can_access_org_row(org_id)
  );

DROP POLICY IF EXISTS "audit_events_insert_system" ON audit_events;
CREATE POLICY "audit_events_insert_system" ON audit_events
  FOR INSERT WITH CHECK (current_setting('app.current_role', true) = 'system');
