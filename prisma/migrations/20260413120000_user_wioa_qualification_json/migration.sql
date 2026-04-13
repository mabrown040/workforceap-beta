-- WIOA self-screening snapshot (JSON: answers, signal, submittedAt)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "wioa_qualification_json" JSONB;
