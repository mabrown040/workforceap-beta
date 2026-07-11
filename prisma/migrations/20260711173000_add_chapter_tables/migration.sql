BEGIN;

SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '30s';

CREATE TABLE "chapters" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "city" TEXT,
    "state" TEXT,
    "leader_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "meeting_schedule" TEXT,
    "meeting_location" TEXT,
    "curriculum_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chapters_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "chapter_members" (
    "id" TEXT NOT NULL,
    "chapter_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'active',
    "notes" TEXT,

    CONSTRAINT "chapter_members_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "chapter_meetings" (
    "id" TEXT NOT NULL,
    "chapter_id" TEXT NOT NULL,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "topic" TEXT,
    "notes" TEXT,
    "attendance_count" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chapter_meetings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "chapter_curriculum_items" (
    "id" TEXT NOT NULL,
    "chapter_id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "order_index" INTEGER NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chapter_curriculum_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "chapters_slug_key" ON "chapters"("slug");
CREATE UNIQUE INDEX "chapter_members_chapter_id_user_id_key" ON "chapter_members"("chapter_id", "user_id");
CREATE UNIQUE INDEX "chapter_curriculum_items_chapter_id_course_id_key" ON "chapter_curriculum_items"("chapter_id", "course_id");

ALTER TABLE "chapters"
    ADD CONSTRAINT "chapters_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "chapters"
    ADD CONSTRAINT "chapters_leader_id_fkey"
    FOREIGN KEY ("leader_id") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "chapter_members"
    ADD CONSTRAINT "chapter_members_chapter_id_fkey"
    FOREIGN KEY ("chapter_id") REFERENCES "chapters"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "chapter_members"
    ADD CONSTRAINT "chapter_members_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "chapter_meetings"
    ADD CONSTRAINT "chapter_meetings_chapter_id_fkey"
    FOREIGN KEY ("chapter_id") REFERENCES "chapters"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "chapter_curriculum_items"
    ADD CONSTRAINT "chapter_curriculum_items_chapter_id_fkey"
    FOREIGN KEY ("chapter_id") REFERENCES "chapters"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "chapter_curriculum_items"
    ADD CONSTRAINT "chapter_curriculum_items_course_id_fkey"
    FOREIGN KEY ("course_id") REFERENCES "courses"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "chapters" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "chapter_members" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "chapter_meetings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "chapter_curriculum_items" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chapters_select_org" ON "chapters"
    FOR SELECT USING (can_access_org_row("organization_id"));
CREATE POLICY "chapters_insert_admin" ON "chapters"
    FOR INSERT WITH CHECK (can_access_org_row("organization_id") AND is_current_admin());
CREATE POLICY "chapters_update_admin" ON "chapters"
    FOR UPDATE USING (can_access_org_row("organization_id") AND is_current_admin())
    WITH CHECK (can_access_org_row("organization_id") AND is_current_admin());
CREATE POLICY "chapters_delete_admin" ON "chapters"
    FOR DELETE USING (can_access_org_row("organization_id") AND is_current_admin());

CREATE POLICY "chapter_members_select_org" ON "chapter_members"
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM "chapters"
            WHERE "chapters"."id" = "chapter_members"."chapter_id"
              AND can_access_org_row("chapters"."organization_id")
        )
    );
CREATE POLICY "chapter_members_insert_admin" ON "chapter_members"
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM "chapters"
            WHERE "chapters"."id" = "chapter_members"."chapter_id"
              AND can_access_org_row("chapters"."organization_id")
              AND is_current_admin()
        )
    );
CREATE POLICY "chapter_members_update_admin" ON "chapter_members"
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM "chapters"
            WHERE "chapters"."id" = "chapter_members"."chapter_id"
              AND can_access_org_row("chapters"."organization_id")
              AND is_current_admin()
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM "chapters"
            WHERE "chapters"."id" = "chapter_members"."chapter_id"
              AND can_access_org_row("chapters"."organization_id")
              AND is_current_admin()
        )
    );
CREATE POLICY "chapter_members_delete_admin" ON "chapter_members"
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM "chapters"
            WHERE "chapters"."id" = "chapter_members"."chapter_id"
              AND can_access_org_row("chapters"."organization_id")
              AND is_current_admin()
        )
    );

CREATE POLICY "chapter_meetings_select_org" ON "chapter_meetings"
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM "chapters"
            WHERE "chapters"."id" = "chapter_meetings"."chapter_id"
              AND can_access_org_row("chapters"."organization_id")
        )
    );
CREATE POLICY "chapter_meetings_insert_admin" ON "chapter_meetings"
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM "chapters"
            WHERE "chapters"."id" = "chapter_meetings"."chapter_id"
              AND can_access_org_row("chapters"."organization_id")
              AND is_current_admin()
        )
    );
CREATE POLICY "chapter_meetings_update_admin" ON "chapter_meetings"
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM "chapters"
            WHERE "chapters"."id" = "chapter_meetings"."chapter_id"
              AND can_access_org_row("chapters"."organization_id")
              AND is_current_admin()
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM "chapters"
            WHERE "chapters"."id" = "chapter_meetings"."chapter_id"
              AND can_access_org_row("chapters"."organization_id")
              AND is_current_admin()
        )
    );
CREATE POLICY "chapter_meetings_delete_admin" ON "chapter_meetings"
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM "chapters"
            WHERE "chapters"."id" = "chapter_meetings"."chapter_id"
              AND can_access_org_row("chapters"."organization_id")
              AND is_current_admin()
        )
    );

CREATE POLICY "chapter_curriculum_items_select_org" ON "chapter_curriculum_items"
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM "chapters"
            WHERE "chapters"."id" = "chapter_curriculum_items"."chapter_id"
              AND can_access_org_row("chapters"."organization_id")
        )
    );
CREATE POLICY "chapter_curriculum_items_insert_admin" ON "chapter_curriculum_items"
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM "chapters"
            WHERE "chapters"."id" = "chapter_curriculum_items"."chapter_id"
              AND can_access_org_row("chapters"."organization_id")
              AND is_current_admin()
        )
    );
CREATE POLICY "chapter_curriculum_items_update_admin" ON "chapter_curriculum_items"
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM "chapters"
            WHERE "chapters"."id" = "chapter_curriculum_items"."chapter_id"
              AND can_access_org_row("chapters"."organization_id")
              AND is_current_admin()
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM "chapters"
            WHERE "chapters"."id" = "chapter_curriculum_items"."chapter_id"
              AND can_access_org_row("chapters"."organization_id")
              AND is_current_admin()
        )
    );
CREATE POLICY "chapter_curriculum_items_delete_admin" ON "chapter_curriculum_items"
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM "chapters"
            WHERE "chapters"."id" = "chapter_curriculum_items"."chapter_id"
              AND can_access_org_row("chapters"."organization_id")
              AND is_current_admin()
        )
    );

COMMIT;
