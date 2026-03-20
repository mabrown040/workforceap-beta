-- Add internal admin notes to partners
ALTER TABLE "partners" ADD COLUMN IF NOT EXISTS "notes" TEXT;
