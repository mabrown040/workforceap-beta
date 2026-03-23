-- Admin AI match workflow timestamps and last suggest outcome (nullable, backward compatible)
ALTER TABLE "jobs" ADD COLUMN "ai_matches_computed_at" TIMESTAMP(3),
ADD COLUMN "match_suggestions_last_sent_at" TIMESTAMP(3),
ADD COLUMN "match_suggestions_last_status" TEXT,
ADD COLUMN "match_suggestions_last_error" TEXT;
