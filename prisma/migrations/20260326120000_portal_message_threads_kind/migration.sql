-- Portal message threads: member / employer / partner (idempotent for retry after partial failure)
DO $$ BEGIN
  CREATE TYPE "message_thread_kind" AS ENUM ('member', 'employer', 'partner');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "message_threads" ADD COLUMN IF NOT EXISTS "kind" "message_thread_kind" NOT NULL DEFAULT 'member';
ALTER TABLE "message_threads" ADD COLUMN IF NOT EXISTS "employer_id" TEXT;
ALTER TABLE "message_threads" ADD COLUMN IF NOT EXISTS "partner_id" TEXT;
ALTER TABLE "message_threads" ADD COLUMN IF NOT EXISTS "portal_user_last_read_at" TIMESTAMP(3);
ALTER TABLE "message_threads" ADD COLUMN IF NOT EXISTS "staff_last_read_at" TIMESTAMP(3);
ALTER TABLE "message_threads" ADD COLUMN IF NOT EXISTS "staff_user_id" TEXT;

DROP INDEX IF EXISTS "message_threads_member_id_key";

ALTER TABLE "message_threads" ALTER COLUMN "member_id" DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "message_threads_member_id_key" ON "message_threads"("member_id");
CREATE UNIQUE INDEX IF NOT EXISTS "message_threads_employer_id_key" ON "message_threads"("employer_id");
CREATE UNIQUE INDEX IF NOT EXISTS "message_threads_partner_id_key" ON "message_threads"("partner_id");

CREATE INDEX IF NOT EXISTS "message_threads_kind_idx" ON "message_threads"("kind");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'message_threads_employer_id_fkey'
  ) THEN
    ALTER TABLE "message_threads" ADD CONSTRAINT "message_threads_employer_id_fkey"
      FOREIGN KEY ("employer_id") REFERENCES "employers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'message_threads_partner_id_fkey'
  ) THEN
    ALTER TABLE "message_threads" ADD CONSTRAINT "message_threads_partner_id_fkey"
      FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'message_threads_staff_user_id_fkey'
  ) THEN
    ALTER TABLE "message_threads" ADD CONSTRAINT "message_threads_staff_user_id_fkey"
      FOREIGN KEY ("staff_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
