-- Sprint 8: first-login onboarding completion timestamps
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "onboarding_completed_at" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "onboarding_portal" TEXT;

ALTER TABLE "employers" ADD COLUMN IF NOT EXISTS "onboarding_completed_at" TIMESTAMP(3);

ALTER TABLE "partners" ADD COLUMN IF NOT EXISTS "onboarding_completed_at" TIMESTAMP(3);

ALTER TABLE "partners" ADD COLUMN IF NOT EXISTS "organization_type" TEXT;
