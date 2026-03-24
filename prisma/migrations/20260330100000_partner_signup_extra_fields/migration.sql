-- Partner self-registration: optional fields from Sprint 5 form
ALTER TABLE "partner_signup_requests" ADD COLUMN IF NOT EXISTS "serve_area" TEXT;
ALTER TABLE "partner_signup_requests" ADD COLUMN IF NOT EXISTS "hear_about" TEXT;
