-- AlterTable
ALTER TABLE "job_posting_applications" ADD COLUMN IF NOT EXISTS "employer_notes" TEXT;
ALTER TABLE "job_posting_applications" ADD COLUMN IF NOT EXISTS "status_updated_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE IF NOT EXISTS "partner_outreach_logs" (
    "id" TEXT NOT NULL,
    "partner_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "created_by_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partner_outreach_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "partner_outreach_logs_partner_id_idx" ON "partner_outreach_logs"("partner_id");
CREATE INDEX IF NOT EXISTS "partner_outreach_logs_member_id_idx" ON "partner_outreach_logs"("member_id");

-- AddForeignKey
DO $$ BEGIN
 ALTER TABLE "partner_outreach_logs" ADD CONSTRAINT "partner_outreach_logs_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "partner_outreach_logs" ADD CONSTRAINT "partner_outreach_logs_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "partner_outreach_logs" ADD CONSTRAINT "partner_outreach_logs_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
