-- AlterTable: add employment barrier tracking fields for WIOA grant reporting
ALTER TABLE "profiles"
  ADD COLUMN IF NOT EXISTS "has_employment_barrier" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "barrier_types" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "employment_status_at_enroll" TEXT;
