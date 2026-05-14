-- Add employer self-signup approval tracking fields

-- Add hear_about column
ALTER TABLE "employers" ADD COLUMN IF NOT EXISTS "hear_about" TEXT;

-- Add approved_at column
ALTER TABLE "employers" ADD COLUMN IF NOT EXISTS "approved_at" TIMESTAMP(3);

-- Add approved_by column (foreign key to users)
ALTER TABLE "employers" ADD COLUMN IF NOT EXISTS "approved_by" TEXT;

-- Add approval_notes column
ALTER TABLE "employers" ADD COLUMN IF NOT EXISTS "approval_notes" TEXT;

-- Create foreign key constraint for approved_by -> users.id
ALTER TABLE "employers" ADD CONSTRAINT "employers_approved_by_fkey"
  FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create index on approved_by for admin queries
CREATE INDEX IF NOT EXISTS "employers_approved_by_idx" ON "employers"("approved_by");

-- Create index on status + created_at for pending employer lists
CREATE INDEX IF NOT EXISTS "employers_status_created_at_idx" ON "employers"("status", "created_at");
