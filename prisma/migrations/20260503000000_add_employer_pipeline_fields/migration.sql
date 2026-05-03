-- AlterTable: add employer pipeline fields
ALTER TABLE "employers"
  ADD COLUMN IF NOT EXISTS "hiring_pipeline_active" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "target_certifications" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "placement_agreement_signed" BOOLEAN NOT NULL DEFAULT false;
