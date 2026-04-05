-- Staff WIOA screening review workflow
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "wioa_review_status" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "wioa_reviewed_at" TIMESTAMPTZ;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "wioa_reviewed_by_user_id" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "wioa_review_notes" TEXT;

CREATE INDEX IF NOT EXISTS "users_wioa_review_status_idx" ON "users"("wioa_review_status");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_wioa_reviewed_by_user_id_fkey'
  ) THEN
    ALTER TABLE "users"
      ADD CONSTRAINT "users_wioa_reviewed_by_user_id_fkey"
      FOREIGN KEY ("wioa_reviewed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Existing self-screenings default to pending review
UPDATE "users"
SET "wioa_review_status" = 'pending'
WHERE "wioa_qualification_json" IS NOT NULL AND "wioa_review_status" IS NULL;
