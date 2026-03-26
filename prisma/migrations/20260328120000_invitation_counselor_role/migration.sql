-- Counselor invitations + optional partner affiliation
ALTER TYPE "InvitationRole" ADD VALUE IF NOT EXISTS 'counselor';

ALTER TABLE "invitations" ADD COLUMN IF NOT EXISTS "partner_id" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'invitations_partner_id_fkey'
  ) THEN
    ALTER TABLE "invitations"
      ADD CONSTRAINT "invitations_partner_id_fkey"
      FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "invitations_partner_id_idx" ON "invitations"("partner_id");
