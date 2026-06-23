-- Portal onboarding wizard state for partner and employer workspaces.
-- These fields exist in Prisma schema and are selected by portal overview pages.
ALTER TABLE "partners"
  ADD COLUMN IF NOT EXISTS "onboarding_current_step" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "employers"
  ADD COLUMN IF NOT EXISTS "onboarding_current_step" INTEGER NOT NULL DEFAULT 0;
