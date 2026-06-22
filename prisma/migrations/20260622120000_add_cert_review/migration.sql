-- Certification verification / review workflow (additive).
-- Default status 'approved' so existing rows + self-attested adds keep counting
-- toward outcomes; proof submissions flip to 'pending' for admin review.

DO $$ BEGIN
  CREATE TYPE "cert_status" AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "user_certifications"
  ADD COLUMN IF NOT EXISTS "status" "cert_status" NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS "proof_url" TEXT,
  ADD COLUMN IF NOT EXISTS "submitted_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "reviewed_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "reviewed_by_id" TEXT;

CREATE INDEX IF NOT EXISTS "user_certifications_status_idx" ON "user_certifications"("status");
