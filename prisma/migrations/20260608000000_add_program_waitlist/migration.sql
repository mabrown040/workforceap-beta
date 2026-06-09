-- Program waitlist for pre-launch notifications (Sprint 14, Trust Track, Story 6).
-- Idempotent: CREATE TABLE IF NOT EXISTS.

CREATE TABLE IF NOT EXISTS "program_waitlist" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "program_slug" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "program_waitlist_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "program_waitlist_program_slug_idx" ON "program_waitlist"("program_slug");
CREATE INDEX IF NOT EXISTS "program_waitlist_email_idx" ON "program_waitlist"("email");
CREATE INDEX IF NOT EXISTS "program_waitlist_created_at_idx" ON "program_waitlist"("created_at");
