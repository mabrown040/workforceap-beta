-- Daily-habit streak: additive, idempotent, non-destructive.
-- Adds three nullable/defaulted columns to the existing member_points table.
-- Safe to (re)apply: every column uses ADD COLUMN IF NOT EXISTS. No data loss,
-- no destructive statements, no new tables.

-- AlterTable
ALTER TABLE "member_points" ADD COLUMN IF NOT EXISTS "current_streak" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "member_points" ADD COLUMN IF NOT EXISTS "longest_streak" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "member_points" ADD COLUMN IF NOT EXISTS "last_active_date" TIMESTAMP(3);
