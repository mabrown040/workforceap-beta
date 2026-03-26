-- CreateEnum
CREATE TYPE "message_thread_kind" AS ENUM ('member', 'employer', 'partner');

-- AlterTable message_threads: add columns (nullable first), backfill, enforce
ALTER TABLE "message_threads" ADD COLUMN "kind" "message_thread_kind" NOT NULL DEFAULT 'member';
ALTER TABLE "message_threads" ADD COLUMN "employer_id" TEXT;
ALTER TABLE "message_threads" ADD COLUMN "partner_id" TEXT;
ALTER TABLE "message_threads" ADD COLUMN "portal_user_last_read_at" TIMESTAMP(3);
ALTER TABLE "message_threads" ADD COLUMN "staff_last_read_at" TIMESTAMP(3);
ALTER TABLE "message_threads" ADD COLUMN "staff_user_id" TEXT;

-- member_id uniqueness was created as a UNIQUE INDEX (see 20260329120000), not a table constraint.
-- Drop the index so we can make member_id nullable and recreate the partial unique index.
DROP INDEX IF EXISTS "message_threads_member_id_key";

ALTER TABLE "message_threads" ALTER COLUMN "member_id" DROP NOT NULL;

CREATE UNIQUE INDEX "message_threads_member_id_key" ON "message_threads"("member_id");
CREATE UNIQUE INDEX "message_threads_employer_id_key" ON "message_threads"("employer_id");
CREATE UNIQUE INDEX "message_threads_partner_id_key" ON "message_threads"("partner_id");

CREATE INDEX "message_threads_kind_idx" ON "message_threads"("kind");

ALTER TABLE "message_threads" ADD CONSTRAINT "message_threads_employer_id_fkey" FOREIGN KEY ("employer_id") REFERENCES "employers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "message_threads" ADD CONSTRAINT "message_threads_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "message_threads" ADD CONSTRAINT "message_threads_staff_user_id_fkey" FOREIGN KEY ("staff_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
