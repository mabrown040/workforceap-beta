-- Renamed from 20260404120000_onboarding_tour_completed on 2026-05-20 to resolve timestamp collision; if running against an environment that already applied 20260404120000_onboarding_tour_completed, manually update `_prisma_migrations.migration_name`.
-- Portal tooltip tour completion (Sprint 8c)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "tour_completed_at" TIMESTAMP(3);
ALTER TABLE "employers" ADD COLUMN IF NOT EXISTS "tour_completed_at" TIMESTAMP(3);
ALTER TABLE "partners" ADD COLUMN IF NOT EXISTS "tour_completed_at" TIMESTAMP(3);
