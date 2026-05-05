-- White-label support: partner-scoped accent color used in the partner portal header.
-- Stored as a hex string (e.g. "#1E3A8A"). Validation lives at the API layer; SQL just stores the value.
-- Idempotent — safe to re-run.

ALTER TABLE "partners" ADD COLUMN IF NOT EXISTS "brand_color" TEXT;
