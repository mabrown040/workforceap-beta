-- AlterTable
ALTER TABLE "partner_referrals" ADD COLUMN IF NOT EXISTS "assigned_partner_user_id" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "portal_workflow_events" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scope" TEXT NOT NULL,
    "employer_id" TEXT,
    "partner_id" TEXT,
    "actor_user_id" TEXT,
    "kind" TEXT NOT NULL,
    "headline" TEXT NOT NULL,
    "detail" TEXT,
    "entity_type" TEXT,
    "entity_id" TEXT,

    CONSTRAINT "portal_workflow_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "portal_workflow_events_employer_id_created_at_idx" ON "portal_workflow_events"("employer_id", "created_at");
CREATE INDEX IF NOT EXISTS "portal_workflow_events_partner_id_created_at_idx" ON "portal_workflow_events"("partner_id", "created_at");

DO $$ BEGIN
 ALTER TABLE "portal_workflow_events" ADD CONSTRAINT "portal_workflow_events_employer_id_fkey" FOREIGN KEY ("employer_id") REFERENCES "employers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
 ALTER TABLE "portal_workflow_events" ADD CONSTRAINT "portal_workflow_events_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
 ALTER TABLE "portal_workflow_events" ADD CONSTRAINT "portal_workflow_events_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE INDEX IF NOT EXISTS "partner_referrals_assigned_partner_user_id_idx" ON "partner_referrals"("assigned_partner_user_id");

DO $$ BEGIN
 ALTER TABLE "partner_referrals" ADD CONSTRAINT "partner_referrals_assigned_partner_user_id_fkey" FOREIGN KEY ("assigned_partner_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
